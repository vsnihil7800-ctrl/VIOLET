import re
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from app.models.finance import Transaction, Debt, Budget
from app.models.productivity import Note, TodoItem, CodingStreak
from app.models.schedule import CalendarEvent, Reminder, Document
from app.models.fitness import WorkoutLog, WeightLog, MealLog

class AICommandCenterService:
    @staticmethod
    def process_command(query: str, db: Session, user_id: str) -> str:
        """Parse natural language command, execute database updates, and return the confirmation reply."""
        q = query.strip()
        q_lower = q.lower()
        
        # 1. Action: Add Expense/Income Transaction
        # Matches: "add ₹250 spent on lunch", "log transaction of 500 for food", "spent 100 on movie"
        match = re.search(
            r'(?:add|log|spent|spent\s+of)\s*[$₹£]?\s*(\d+(?:\.\d+)?)\s*(?:spent\s*)?(?:on|for)\s+(.+)', 
            q_lower
        )
        if match:
            amount = float(match.group(1))
            desc = match.group(2).strip()
            
            # Map category
            cat = "Others"
            desc_check = desc.lower()
            if any(k in desc_check for k in ["lunch", "food", "dinner", "burger", "cafe", "coffee", "restaurant"]):
                cat = "Food & Dining"
            elif any(k in desc_check for k in ["bill", "electricity", "water", "internet", "power", "utility"]):
                cat = "Utilities & Bills"
            elif any(k in desc_check for k in ["rent", "mortgage", "house"]):
                cat = "Rent & Mortgage"
            elif any(k in desc_check for k in ["uber", "cab", "taxi", "bus", "train", "fuel", "gas", "transit"]):
                cat = "Transportation"
            elif any(k in desc_check for k in ["movie", "game", "netflix", "concert", "show"]):
                cat = "Entertainment"
            elif any(k in desc_check for k in ["shop", "clothe", "amazon", "shoes"]):
                cat = "Shopping"
                
            tx = Transaction(
                user_id=user_id,
                type="expense",
                category=cat,
                amount=amount,
                date=datetime.now(timezone.utc),
                description=desc.capitalize()
            )
            db.add(tx)
            db.commit()
            return (
                f"### 💸 Transaction Logged\n"
                f"I've added an expense to your **Finance** ledger:\n"
                f"- **Amount**: ₹{amount:.2f}\n"
                f"- **Category**: {cat}\n"
                f"- **Merchant/Details**: \"{desc.capitalize()}\"\n\n"
                f"Your budgets and net savings stats have been recalculated."
            )

        # 2. Action: Create Note
        # Matches: "create a note about today's lecture", "write a note about my coding targets"
        match = re.search(
            r'(?:create|write|add|new)\s+a?\s*note\s+(?:about|titled)?\s*(.+)', 
            q_lower
        )
        if match:
            content = match.group(1).strip()
            title = content[:30].capitalize() + ("..." if len(content) > 30 else "")
            
            note = Note(
                user_id=user_id,
                title=title,
                content=content.capitalize(),
                color="indigo",
                is_pinned=False
            )
            db.add(note)
            db.commit()
            return (
                f"### 📝 Sticky Note Pinned\n"
                f"I've saved a new sticky note to your board:\n"
                f"- **Title**: {title}\n"
                f"- **Content**: \"{content.capitalize()}\"\n\n"
                f"You can view it inside your **Productivity** notes board."
            )

        # 3. Action: Create Reminder
        # Matches: "create a reminder to pay electricity bill tomorrow at 8 PM", "remind me to drink water"
        match = re.search(
            r'(?:create\s+a?\s*reminder\s+to|remind\s+me\s+to)\s+(.+)', 
            q_lower
        )
        if match:
            details_str = match.group(1).strip()
            target_time = datetime.now(timezone.utc) + timedelta(hours=2) # default
            time_label = "in 2 hours"
            
            # Simple day parses
            if "tomorrow" in details_str:
                target_time = datetime.now(timezone.utc) + timedelta(days=1)
                time_label = "tomorrow"
                details_str = details_str.replace("tomorrow", "").strip()
                
            reminder = Reminder(
                user_id=user_id,
                title=details_str.capitalize(),
                time=target_time,
                is_sent=False
            )
            db.add(reminder)
            db.commit()
            return (
                f"### 🔔 Reminder Scheduled\n"
                f"I've set an alarm notification:\n"
                f"- **Reminder**: \"{details_str.capitalize()}\"\n"
                f"- **Time**: {target_time.strftime('%Y-%m-%d %H:%M')} UTC ({time_label})\n\n"
                f"I will alert you when it goes off."
            )

        # 4. Action: Log Debt / Borrowed/Lent Contacts
        # Matches: "how much money does rahul owe me", "add 500 that i lent to arjun"
        match = re.search(r'(.+?)\s+owes\s+me\s+[$₹£]?\s*(\d+(?:\.\d+)?)', q_lower)
        if not match:
            match = re.search(r'lent\s+[$₹£]?\s*(\d+(?:\.\d+)?)\s+to\s+(.+)', q_lower)
            if match:
                amount = float(match.group(1))
                person = match.group(2).strip().capitalize()
            else:
                amount = None
                person = None
        else:
            person = match.group(1).strip().capitalize()
            amount = float(match.group(2))
            
        if person and amount:
            person = re.sub(r'^(?:add|log|borrowed|lent)\s+', '', person, flags=re.IGNORECASE).strip().capitalize()
            debt = Debt(
                user_id=user_id,
                type="owed_to_me",
                person=person,
                amount=amount,
                description="Lent money",
                is_settled=False
            )
            db.add(debt)
            db.commit()
            return (
                f"### 🤝 IOU Registered\n"
                f"I've updated your debt tracking ledger:\n"
                f"- **Contact**: {person}\n"
                f"- **Amount**: ₹{amount:.2f} (Owed to Me)\n\n"
                f"You can verify settlements inside the **Finance** panel."
            )

        # 5. Action: Create Calendar Event
        # Matches: "add a meeting on Friday at 3 PM", "add event team sync"
        match = re.search(
            r'(?:add|schedule)\s+a?\s*(?:meeting|event|appointment)\s+(?:on|about)?\s*(.+)', 
            q_lower
        )
        if match:
            title = match.group(1).strip()
            target_start = datetime.now(timezone.utc) + timedelta(days=1)
            target_end = target_start + timedelta(hours=1)
            
            event = CalendarEvent(
                user_id=user_id,
                title=title.capitalize(),
                description="Scheduled by Violet AI Assistant",
                start_time=target_start,
                end_time=target_end,
                color="indigo"
            )
            db.add(event)
            db.commit()
            return (
                f"### 📅 Calendar Event Booked\n"
                f"I've blocked a slot on your calendar:\n"
                f"- **Event Title**: {title.capitalize()}\n"
                f"- **Planned Time**: {target_start.strftime('%A, %b %d at %I:%M %p')}\n\n"
                f"This event is now visible on your **Calendar** grid."
            )

        # 6. RAG Queries Intent matches
        # ----------------- FINANCE LISTING QUERY -----------------
        if any(k in q_lower for k in ["spent", "money", "finance", "income", "expense", "budget", "debt", "owe"]):
            txs = db.query(Transaction).filter(Transaction.user_id == user_id).order_by(Transaction.date.desc()).limit(5).all()
            budgets = db.query(Budget).filter(Budget.user_id == user_id).all()
            debts = db.query(Debt).filter(Debt.user_id == user_id, Debt.is_settled == False).all()
            
            income_sum = sum(t.amount for t in txs if t.type == "income")
            expense_sum = sum(t.amount for t in txs if t.type == "expense")
            owed_to_me = sum(d.amount for d in debts if d.type == "owed_to_me")
            owed_by_me = sum(d.amount for d in debts if d.type == "owed_by_me")
            
            return (
                f"### 📊 Finance RAG Report\n"
                f"Retrieved logs from your database:\n\n"
                f"- **Transactions (last 5)**: Incomes sum to **₹{income_sum:,.2f}** vs Expenses sum to **₹{expense_sum:,.2f}**.\n"
                f"- **Budgets**: You have **{len(budgets)}** active budget lines.\n"
                f"- **IOUs**: Contacts owe you **₹{owed_to_me:,.2f}**; you owe contacts **₹{owed_by_me:,.2f}**."
            )
            
        # ----------------- FITNESS LISTING QUERY -----------------
        elif any(k in q_lower for k in ["workout", "gym", "fit", "fitness", "calorie", "meal", "protein", "weight", "streak"]):
            workouts = db.query(WorkoutLog).filter(WorkoutLog.user_id == user_id).order_by(WorkoutLog.date.desc()).all()
            meals = db.query(MealLog).filter(MealLog.user_id == user_id).order_by(MealLog.date.desc()).limit(5).all()
            weights = db.query(WeightLog).filter(WeightLog.user_id == user_id).order_by(WeightLog.date.desc()).first()
            
            calories_today = sum(m.calories for m in meals)
            
            return (
                f"### 🏃 Fitness RAG Report\n"
                f"Retrieved health metrics from your database:\n\n"
                f"- **workouts**: **{len(workouts)}** active workout sessions logged.\n"
                f"- **Calories Eaten**: **{calories_today:.0f} kcal** logged today.\n"
                f"- **body weight**: **{f'{weights.weight} kg' if weights else 'None'}** is your latest tracked weight."
            )

        # ----------------- DEFAULT COGNITIVE GUIDE -----------------
        txs_count = db.query(Transaction).filter(Transaction.user_id == user_id).count()
        todos_count = db.query(TodoItem).filter(TodoItem.user_id == user_id, TodoItem.completed == False).count()
        events_count = db.query(CalendarEvent).filter(CalendarEvent.user_id == user_id).count()
        docs_count = db.query(Document).filter(Document.user_id == user_id).count()

        return (
            f"Hi! I am **Violet**, your AI assistant companion. I monitor your workspaces and database tables.\n\n"
            f"Here is a summary of your workspace parameters:\n"
            f"- **Finance Transactions**: **{txs_count}** logs logged\n"
            f"- **Productivity checklist**: **{todos_count}** pending checklist tasks\n"
            f"- **Planner Agendas**: **{events_count}** events blocked on grid\n"
            f"- **Vault Documents**: **{docs_count}** files secured\n\n"
            f"You can command me to log items in plain text, e.g.:\n"
            f"- *\"Add ₹15 spent on dinner\"*\n"
            f"- *\"Create a note about my task list\"*\n"
            f"- *\"Remind me to call client tomorrow\"*"
        )
