import re
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from app.models.finance import Transaction, Debt, Budget
from app.models.productivity import Note, TodoItem, CodingStreak
from app.models.schedule import CalendarEvent, Reminder, Document
from app.models.fitness import WorkoutLog, WeightLog, MealLog
from app.models.investment import InvestmentTransaction

_FILLER_WORDS = [
    "hey", "hi", "please", "pls", "can you", "could you", "would you",
    "i want to", "i want you to", "i need to", "i need you to",
    "just", "kindly", "go ahead and", "note down that", "note that",
    "around", "about", "approximately", "roughly", "today", "so",
]

_CURRENCY_WORDS = ["rupees", "rs.", "rs", "inr"]


def _strip_fillers(text: str) -> str:
    cleaned = text
    for word in _FILLER_WORDS:
        cleaned = re.sub(rf"\b{re.escape(word)}\b", " ", cleaned, flags=re.IGNORECASE)
    for word in _CURRENCY_WORDS:
        cleaned = re.sub(rf"\b{re.escape(word)}\b", " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


class AICommandCenterService:
    @staticmethod
    def process_command(query: str, db: Session, user_id: str) -> str:
        """Parse natural language command, execute database updates, and return the confirmation reply."""
        q = query.strip()
        q_lower = _strip_fillers(q.lower())

        match = re.search(
            r'(?:add|log|spent|spend|had|have|paid|pay|bought|buy|got)\s*[$₹£]?\s*(\d+(?:\.\d+)?)\s*(?:spent\s*)?(?:on|for)\s+(.+)',
            q_lower
        )
        reversed_match = None
        if not match:
            reversed_match = re.search(
                r'(?:had|have|bought|buy|got)\s+(.+?)\s+for\s*[$₹£]?\s*(\d+(?:\.\d+)?)',
                q_lower
            )

        if match or reversed_match:
            if match:
                amount = float(match.group(1))
                desc = match.group(2).strip()
            else:
                desc = reversed_match.group(1).strip()
                amount = float(reversed_match.group(2))

            cat = "Others"
            desc_check = desc.lower()
            if any(k in desc_check for k in ["lunch", "food", "dinner", "breakfast", "burger", "cafe", "coffee", "restaurant", "snack", "groceries", "grocery"]):
                cat = "Food & Dining"
            elif any(k in desc_check for k in ["bill", "electricity", "water", "internet", "power", "utility", "wifi", "recharge"]):
                cat = "Utilities & Bills"
            elif any(k in desc_check for k in ["rent", "mortgage", "house"]):
                cat = "Rent & Mortgage"
            elif any(k in desc_check for k in ["uber", "cab", "taxi", "bus", "train", "fuel", "gas", "transit", "auto", "petrol"]):
                cat = "Transportation"
            elif any(k in desc_check for k in ["movie", "game", "netflix", "concert", "show", "spotify", "prime"]):
                cat = "Entertainment"
            elif any(k in desc_check for k in ["shop", "clothe", "amazon", "shoes", "shirt", "flipkart"]):
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

        match = re.search(
            r'(?:create|write|add|new|make)\s+a?\s*(?:note|sticky)\s+(?:about|titled|for)?\s*(.+)',
            q_lower
        )
        if not match:
            match = re.search(r'(?:jot\s+down|remember\s+that|remember)\s+(.+)', q_lower)
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

        match = re.search(
            r'(?:add|create|new)\s+a?\s*(?:task|todo|to-do)\s*(?:to|about|:)?\s*(.+)',
            q_lower
        )
        if match:
            title = match.group(1).strip()
            priority = "medium"
            if any(k in title for k in ["urgent", "important", "asap", "high priority"]):
                priority = "high"
            elif any(k in title for k in ["low priority", "whenever", "eventually"]):
                priority = "low"

            todo = TodoItem(
                user_id=user_id,
                title=title.capitalize(),
                completed=False,
                priority=priority,
            )
            db.add(todo)
            db.commit()
            return (
                f"### ✅ Task Added\n"
                f"I've added a new item to your checklist:\n"
                f"- **Task**: {title.capitalize()}\n"
                f"- **Priority**: {priority.capitalize()}\n\n"
                f"Find it inside **Productivity > Task Records**."
            )

        match = re.search(
            r'(?:create\s+a?\s*reminder\s+to|remind\s+me\s+to|set\s+a?\s*(?:reminder|alarm)\s+to|alert\s+me\s+to)\s+(.+)',
            q_lower
        )
        if match:
            details_str = match.group(1).strip()
            target_time = datetime.now(timezone.utc) + timedelta(hours=2)
            time_label = "in 2 hours"

            if "tomorrow" in details_str:
                target_time = datetime.now(timezone.utc) + timedelta(days=1)
                time_label = "tomorrow"
                details_str = details_str.replace("tomorrow", "").strip()
            elif "tonight" in details_str:
                target_time = datetime.now(timezone.utc) + timedelta(hours=5)
                time_label = "tonight"
                details_str = details_str.replace("tonight", "").strip()

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

        match = re.search(r'(.+?)\s+owes\s+me\s+[$₹£]?\s*(\d+(?:\.\d+)?)', q_lower)
        if not match:
            match = re.search(r'lent\s+[$₹£]?\s*(\d+(?:\.\d+)?)\s+to\s+(.+)', q_lower)
            if match:
                amount = float(match.group(1))
                person = match.group(2).strip().capitalize()
            else:
                match = re.search(r'(.+?)\s+borrowed\s+[$₹£]?\s*(\d+(?:\.\d+)?)\s+from\s+me', q_lower)
                if match:
                    person = match.group(1).strip().capitalize()
                    amount = float(match.group(2))
                else:
                    amount = None
                    person = None
        else:
            person = match.group(1).strip().capitalize()
            amount = float(match.group(2))

        if person and amount:
            person = re.sub(r'^(?:add|log|borrowed|lent|i)\s+', '', person, flags=re.IGNORECASE).strip().capitalize()
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

        match = re.search(
            r'(?:add|schedule|plan|block\s+time\s+for)\s+a?\s*(?:meeting|event|appointment)?\s*(?:on|about|for)?\s*(.+)',
            q_lower
        )
        if match and any(k in q_lower for k in ["meeting", "event", "appointment", "block time"]):
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

        match = re.search(
            r'(?:log|add|did|do|record)\s+(?:a\s+)?(\d+)\s*(?:min|mins|minute|minutes)?\s*(?:of\s+)?(\w[\w\s]*?)\s*(?:workout|training|session)?$',
            q_lower
        )
        if match and any(k in q_lower for k in ["workout", "training", "gym", "cardio", "yoga", "strength", "exercise", "run", "ran"]):
            duration = int(match.group(1))
            exercise_raw = match.group(2).strip()
            exercise_type = "Strength"
            if any(k in exercise_raw for k in ["cardio", "run", "ran", "jog"]):
                exercise_type = "Cardio"
            elif "yoga" in exercise_raw:
                exercise_type = "Yoga"

            workout = WorkoutLog(
                user_id=user_id,
                exercise_type=exercise_type,
                duration_minutes=duration,
                calories_burned=duration * 7.0,
            )
            db.add(workout)
            db.commit()
            return (
                f"### 🏋️ Workout Logged\n"
                f"I've added a session to your **Fitness** log:\n"
                f"- **Type**: {exercise_type}\n"
                f"- **Duration**: {duration} minutes\n"
                f"- **Est. Calories Burned**: {duration * 7:.0f} kcal\n\n"
                f"Your gym streak has been updated."
            )

        match = re.search(r'weigh(?:t|ed|s)?\s*(?:as|is|of)?\s*(\d+(?:\.\d+)?)\s*(?:kg|kgs)?', q_lower)
        if match and any(k in q_lower for k in ["weight", "weigh"]):
            weight_kg = float(match.group(1))
            weight_log = WeightLog(user_id=user_id, weight_kg=weight_kg)
            db.add(weight_log)
            db.commit()
            return (
                f"### ⚖️ Weight Logged\n"
                f"Recorded a new entry in your **Fitness** trend chart:\n"
                f"- **Weight**: {weight_kg} kg\n\n"
                f"Your weight history graph has been updated."
            )

        match = re.search(
            r'(?:log|add|ate|eat)\s+(?:a\s+)?meal\s+(.+?)\s+(\d+(?:\.\d+)?)\s*(?:cal|calorie|calories|kcal)',
            q_lower
        )
        if not match:
            match = re.search(
                r'(?:ate|eat|had)\s+(.+?)\s+(?:with\s+)?(\d+(?:\.\d+)?)\s*(?:cal|calorie|calories|kcal)',
                q_lower
            )
        if match:
            food_name = match.group(1).strip()
            calories = float(match.group(2))
            meal_type = "snack"
            if "breakfast" in q_lower:
                meal_type = "breakfast"
            elif "lunch" in q_lower:
                meal_type = "lunch"
            elif "dinner" in q_lower:
                meal_type = "dinner"

            meal = MealLog(
                user_id=user_id,
                meal_type=meal_type,
                food_name=food_name.capitalize(),
                calories=calories,
            )
            db.add(meal)
            db.commit()
            return (
                f"### 🍽️ Meal Logged\n"
                f"Added to your **Fitness** meal diary:\n"
                f"- **Food**: {food_name.capitalize()}\n"
                f"- **Meal Type**: {meal_type.capitalize()}\n"
                f"- **Calories**: {calories:.0f} kcal\n\n"
                f"Your daily calorie total has been recalculated."
            )

        match = re.search(
            r'(bought|buy|sold|sell)\s+(\d+(?:\.\d+)?)\s+([a-zA-Z]{2,6})\s+(?:at|for)\s*[$₹£]?\s*(\d+(?:\.\d+)?)',
            q_lower
        )
        if match:
            action_word, qty_str, ticker, price_str = match.groups()
            transaction_type = "sell" if action_word in ("sold", "sell") else "buy"
            quantity = float(qty_str)
            price = float(price_str)
            ticker = ticker.upper()
            asset_type = "crypto" if ticker in ("BTC", "ETH", "SOL", "ADA", "DOT") else "stock"

            trade = InvestmentTransaction(
                user_id=user_id,
                asset_type=asset_type,
                ticker=ticker,
                name=ticker,
                transaction_type=transaction_type,
                quantity=quantity,
                price=price,
            )
            db.add(trade)
            db.commit()
            return (
                f"### 📈 Trade Logged\n"
                f"Recorded a new {transaction_type} order in your **Investments** audit log:\n"
                f"- **Ticker**: {ticker}\n"
                f"- **Quantity**: {quantity}\n"
                f"- **Price**: ₹{price:,.2f}/unit\n\n"
                f"Your portfolio value and allocation have been recalculated."
            )

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
                f"- **body weight**: **{f'{weights.weight_kg} kg' if weights else 'None'}** is your latest tracked weight."
            )

        elif any(k in q_lower for k in ["portfolio", "stock", "crypto", "investment", "trade", "ticker", "shares"]):
            trades = db.query(InvestmentTransaction).filter(InvestmentTransaction.user_id == user_id).all()
            tickers = sorted({t.ticker for t in trades})

            return (
                f"### 📈 Investments RAG Report\n"
                f"Retrieved logs from your database:\n\n"
                f"- **Logged Trades**: **{len(trades)}** total.\n"
                f"- **Tickers Held**: {', '.join(tickers) if tickers else 'None yet'}\n\n"
                f"Visit the **Investments** tab for live pricing and full P&L."
            )

        elif any(k in q_lower for k in ["task", "todo", "to-do", "checklist", "productivity", "note", "sticky"]):
            todos = db.query(TodoItem).filter(TodoItem.user_id == user_id, TodoItem.completed == False).all()
            notes = db.query(Note).filter(Note.user_id == user_id).count()

            return (
                f"### ✅ Productivity RAG Report\n"
                f"Retrieved logs from your database:\n\n"
                f"- **Pending Tasks**: **{len(todos)}**\n"
                f"- **Sticky Notes**: **{notes}** saved\n\n"
                f"Visit the **Productivity** tab for the full checklist."
            )

        elif any(k in q_lower for k in ["schedule", "calendar", "event", "reminder", "alarm", "meeting", "appointment"]):
            events = db.query(CalendarEvent).filter(CalendarEvent.user_id == user_id).count()
            reminders = db.query(Reminder).filter(Reminder.user_id == user_id, Reminder.is_sent == False).count()

            return (
                f"### 📅 Schedule RAG Report\n"
                f"Retrieved logs from your database:\n\n"
                f"- **Calendar Events**: **{events}** total\n"
                f"- **Active Reminders**: **{reminders}**\n\n"
                f"Visit the **Schedule** tab for the full calendar."
            )

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
            f"- *\"Remind me to call client tomorrow\"*\n"
            f"- *\"Add a task to finish the report\"*\n"
            f"- *\"I did 30 minutes of cardio\"*\n"
            f"- *\"I weigh 70 kg today\"*\n"
            f"- *\"I bought 1 AAPL at 19000\"*"
        )
