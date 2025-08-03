# Credit Card Billing System - TODO

## ✅ **COMPLETED - Foreign Currency Parsing (Phase 1)**

### **Database Schema Updates**

- ✅ Added foreign currency columns to `payment` table:
  - `is_foreign_currency BOOLEAN DEFAULT 0`
  - `foreign_currency_amount REAL`
  - `foreign_currency_type TEXT`
- ✅ Updated `ccbilling_schema.sql` to reflect current state
- ✅ Applied migrations to local and remote databases
- ✅ Fixed failing tests to include new foreign currency columns

### **Enhanced PDF Parsing**

- ✅ Fixed PDF text extraction to preserve line breaks properly
- ✅ Improved amount pattern matching to handle amounts like `.14`
- ✅ Added foreign currency detection and parsing logic
- ✅ Implemented multi-line foreign currency transaction handling

### **Foreign Currency Support**

- ✅ Detects foreign transactions (e.g., "DSB" for Danish transactions)
- ✅ Captures foreign currency amounts and types from conversion lines
- ✅ Displays foreign currency info in dedicated UI column
- ✅ Properly handles multi-line foreign currency transactions
- ✅ Removed debug statements and reinstated automatic page refresh

### **Example Foreign Currency Transaction**

```
06/21 DSB 7-ELEVEN KVIKK KOEBENHAVN V 22.45
06/22 DANISH KRONE
145.00 X 0.154827586 (EXCHG RATE)
```

**Result:** Single transaction with foreign currency details attached

---

## 🔄 **IN PROGRESS - Phase 2: Merchant Classification**

### **LLAMA API Integration (Retained for Phase 2)**

- [ ] Implement merchant classification using LLAMA API
- [ ] Add merchant categorization to database schema
- [ ] Create merchant classification service
- [ ] Integrate with existing parsing pipeline

### **Enhanced Merchant Data**

- [ ] Add merchant categories (e.g., "Restaurants", "Travel", "Shopping")
- [ ] Implement merchant tagging system
- [ ] Add merchant search and filtering
- [ ] Create merchant analytics dashboard

---

## 📋 **FUTURE ENHANCEMENTS**

### **Budget Management**

- [ ] Implement budget tracking by category
- [ ] Add budget alerts and notifications
- [ ] Create budget vs actual spending reports
- [ ] Add budget rollover functionality

### **Advanced Analytics**

- [ ] Spending trends analysis
- [ ] Category-based spending reports
- [ ] Year-over-year comparison
- [ ] Export functionality for tax purposes

### **User Experience**

- [ ] Mobile-responsive design improvements
- [ ] Dark/light theme toggle
- [ ] Keyboard shortcuts
- [ ] Bulk operations for charges

### **System Improvements**

- [ ] Performance optimization for large statements
- [ ] Caching improvements
- [ ] Error handling enhancements
- [ ] Automated testing coverage

---

## 🎯 **CURRENT STATUS**

**Phase 1 Complete:** Foreign currency parsing is fully implemented and working. The system can now:

- Parse PDF statements with proper line break preservation
- Detect and combine multi-line foreign currency transactions
- Store foreign currency data in the database
- Display foreign currency information in the UI
- Handle various amount formats (including `.14` style amounts)

**Next Priority:** Phase 2 - Merchant classification using LLAMA API for enhanced merchant categorization and analytics.

---

## 📝 **TECHNICAL NOTES**

### **Database Schema**

```sql
-- Current payment table structure
CREATE TABLE payment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  statement_id INTEGER NOT NULL REFERENCES statement(id),
  merchant TEXT NOT NULL,
  amount REAL NOT NULL,
  allocated_to TEXT NOT NULL,
  transaction_date DATE,
  is_foreign_currency BOOLEAN DEFAULT 0,
  foreign_currency_amount REAL,
  foreign_currency_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### **Foreign Currency Detection**

- Supported currencies: DSB, DANISH KRONE, EURO, POUND, YEN, FRANC, KRONA, PESO, REAL, YUAN, WON, RUBLE, LIRA, RAND
- Multi-line transaction parsing for currency conversion details
- Exchange rate pattern matching: `145.00 X 0.154827586`

### **PDF Parsing Improvements**

- Line-based parsing with proper Y-position grouping
- Amount pattern matching: `([-\d,]*\.?\d{1,2})$`
- Foreign currency look-ahead logic for multi-line transactions
