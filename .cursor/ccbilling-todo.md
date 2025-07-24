# CCBilling Feature Implementation TODO

## ✅ Completed

- [x] D1 schema design (`ccbilling_schema.sql`)
- [x] D1 database setup script (`create_ccbilling_d1.sh`) - works for both dev and prod
- [x] Basic UI stubs created (`/projects/ccbilling/*` routes)
- [x] Requirements documented (`docs/ccbilling.md`)
- [x] Authentication enforcement for ccbilling routes

## 🔄 In Progress

- [ ] Backend API implementation

## 📋 Backend API Implementation

- [ ] **Billing Cycle API**

  - [ ] `POST /api/ccbilling/cycles` - Create new billing cycle
  - [ ] `GET /api/ccbilling/cycles` - List billing cycles
  - [ ] `GET /api/ccbilling/cycles/[id]` - Get billing cycle details
  - [ ] `PUT /api/ccbilling/cycles/[id]/close` - Close billing cycle
  - [ ] Authentication check on all endpoints

- [x] **Credit Card API** ✅ **TESTED**

  - [x] `POST /api/ccbilling/cards` - Add credit card
  - [x] `GET /api/ccbilling/cards` - List credit cards
  - [x] `GET /api/ccbilling/cards/[id]` - Get single credit card
  - [x] `PUT /api/ccbilling/cards/[id]` - Update credit card
  - [x] `DELETE /api/ccbilling/cards/[id]` - Remove credit card
  - [x] Authentication check on all endpoints
  - [x] **API Testing Complete** - All endpoints tested with local D1 database

- [ ] **Budget API**

  - [ ] `POST /api/ccbilling/budgets` - Add budget
  - [ ] `GET /api/ccbilling/budgets` - List budgets
  - [ ] `PUT /api/ccbilling/budgets/[id]` - Update budget
  - [ ] `DELETE /api/ccbilling/budgets/[id]` - Remove budget
  - [ ] `POST /api/ccbilling/budgets/[id]/merchants` - Add merchant auto-association
  - [ ] Authentication check on all endpoints

- [ ] **Statement API**

  - [ ] `POST /api/ccbilling/cycles/[id]/statements` - Upload statement PDF
  - [ ] `GET /api/ccbilling/cycles/[id]/statements` - List statements for cycle
  - [ ] Store PDF in Cloudflare R2
  - [ ] Store statement metadata in D1
  - [ ] Authentication check on all endpoints

- [ ] **Charge API**
  - [ ] `POST /api/ccbilling/statements/[id]/parse` - Parse statement via Llama API
  - [ ] `GET /api/ccbilling/cycles/[id]/charges` - List charges for cycle
  - [ ] `PUT /api/ccbilling/charges/[id]` - Update charge (assign to budget)
  - [ ] `POST /api/ccbilling/cycles/[id]/charges/bulk-assign` - Bulk assign charges to budgets
  - [ ] Authentication check on all endpoints

## 📋 File Upload & Storage

- [ ] **R2 Integration**

  - [ ] Configure R2 bucket for statement storage
  - [ ] Implement upload to R2 with unique keys
  - [ ] Handle upload errors and validation
  - [ ] Store R2 key in statement metadata

- [ ] **PDF Upload UI**
  - [ ] File input component for PDF upload
  - [ ] Upload progress indicator
  - [ ] File validation (PDF only, size limits)
  - [ ] Error handling for failed uploads

## 📋 Statement Parsing

- [ ] **Llama API Integration**

  - [ ] Configure Llama API credentials
  - [ ] Implement PDF text extraction
  - [ ] Parse charges from statement text
  - [ ] Handle parsing errors gracefully
  - [ ] Store parsed charges in database

- [ ] **Parsing Logic**
  - [ ] Extract date, amount, merchant from statement
  - [ ] Match charges to credit cards by last 4 digits
  - [ ] Handle different statement formats
  - [ ] Validate parsed data before storing

## 📋 Frontend UI Implementation

- [ ] **Billing Cycle Management**

  - [ ] Connect `/projects/ccbilling` list to backend API
  - [ ] Connect `/projects/ccbilling/new` form to backend API
  - [ ] Implement billing cycle details page (`/projects/ccbilling/[id]`)
  - [ ] Add "Close Cycle" functionality with confetti

- [ ] **Credit Card Management**

  - [ ] Create credit card management UI
  - [ ] Add/edit/remove credit cards
  - [ ] Display credit cards in billing cycle view

- [ ] **Budget Management**

  - [ ] Create budget management UI
  - [ ] Add/edit/remove budgets
  - [ ] Merchant auto-association interface
  - [ ] Display budgets in billing cycle view

- [ ] **Statement Upload**

  - [ ] Connect upload UI to backend
  - [ ] Show upload progress
  - [ ] Display uploaded statements
  - [ ] Trigger parsing after upload

- [ ] **Charge Review & Assignment**
  - [ ] Display charges grouped by credit card
  - [ ] Show charge details (date, amount, merchant)
  - [ ] Budget assignment interface
  - [ ] Quick merchant-to-budget assignment
  - [ ] Show budget totals for cycle
  - [ ] Bulk assignment functionality

## 📋 Authentication & Security

- [ ] **Route Protection**

  - [ ] Protect all `/projects/ccbilling/*` routes
  - [ ] Redirect to login if not authenticated
  - [ ] Protect all API endpoints

- [ ] **Data Security**
  - [ ] Ensure user can only access their own data
  - [ ] Validate file uploads (PDF only, size limits)
  - [ ] Sanitize all user inputs

## 📋 Testing & Validation

- [ ] **Manual Testing**

  - [ ] Test billing cycle creation
  - [ ] Test statement upload and parsing
  - [ ] Test charge review and budget assignment
  - [ ] Test cycle closing with confetti
  - [ ] Test authentication flows

- [ ] **Error Handling**
  - [ ] Handle upload failures
  - [ ] Handle parsing errors
  - [ ] Handle API errors
  - [ ] Handle authentication errors

## 📋 Polish & Documentation

- [ ] **User Experience**

  - [ ] Loading states for all async operations
  - [ ] Success/error messages
  - [ ] Responsive design
  - [ ] Accessibility improvements

- [ ] **Documentation**
  - [ ] Update `docs/ccbilling.md` with implementation details
  - [ ] Update `.cursor/context.md` with new feature
  - [ ] Add usage instructions

## 🚀 MVP Release Criteria

- [ ] User can create billing cycles
- [ ] User can upload and parse statements
- [ ] User can review and assign charges to budgets
- [ ] User can close billing cycles with celebration
- [ ] All functionality requires authentication
- [ ] Basic error handling in place

## 🔮 Future Enhancements

- [ ] Merchant auto-categorization improvements
- [ ] Historical analytics and insights
- [ ] Export functionality
- [ ] Multi-user support
- [ ] Advanced reporting

---

**Last Updated:** July 24, 2025
**Status:** Credit Card API complete and tested. Ready for next API implementation.
