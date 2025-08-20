# Stripe Two-Tier System Implementation Tasks

**Document Version**: 1.0  
**Date**: July 30, 2025  
**Status**: Implementation Ready  

---

## 🎯 **Phase 1: Database & Backend Foundation**

### **Task 1.1: Update Database Schema**
- [x] **Update subscription_plans table structure**
  - Drop old `max_audio_minutes_per_file` and `max_audio_minutes_per_month` columns
  - Add `max_file_size_mb`, `total_monthly_mb`, `concurrent_jobs`, `output_formats` columns
  - Update existing enum to support `('free', 'student')` tiers only
  
- [x] **Update usage tracking table**
  - Drop `audio_minutes_processed` column
  - Add `total_mb_used` and `files_processed` columns
  - Create new index for monthly MB queries
  
- [x] **Insert two-tier plan data**
  - Free: 2 summaries, 60MB files, 120MB monthly, PDF only
  - Student: 700MB monthly cap, 300MB files, TXT+MD+PDF, €5/month

**Estimated Time**: 2-3 hours  
**Dependencies**: None  
**Validation**: Query plans table and verify correct data structure

### **Task 1.2: Create Enhanced Database Functions**
- [x] **Implement check_usage_limits() function**
  - Support both file size and monthly MB validation
  - Return comprehensive usage information
  - Include available output formats in response
  
- [x] **Implement track_usage() function**
  - Track MB usage instead of minutes
  - Increment file processing counters
  - Handle monthly rollover logic
  
- [x] **Test database functions**
  - Database functions deployed and tested
  - Migration executed successfully
  - Schema updated to support two-tier system

**Estimated Time**: 4-5 hours  
**Dependencies**: Task 1.1 completed  
**Validation**: Automated tests pass, performance benchmarks meet targets

### **Task 1.3: Update API Integration Points**
- [x] **Update generate.ts API endpoint**
  - Integrate file size validation before processing
  - Call usage limit functions
  - Return usage information in responses
  - Handle limit exceeded scenarios with proper error messages
  
- [x] **Update Stripe webhook handler**
  - Map Student tier subscription correctly
  - Handle €5/month price point
  - Update user profiles with correct tier information

**Estimated Time**: 3-4 hours  
**Dependencies**: Tasks 1.1, 1.2 completed  
**Validation**: API tests pass, webhook integration works

---

## 🎯 **Phase 2: Multi-Format File Generation**

### **Task 2.1: Implement TXT File Generation**
- [x] **Create generateTXTFile() function**
  - Extract full transcription text
  - Generate clean filename format
  - Upload to Supabase storage with proper metadata
  - Return file path for database storage
  
- [x] **Update file processing pipeline**
  - Store transcription text for TXT generation
  - Handle Student tier TXT file creation
  - Ensure proper error handling and cleanup

**Estimated Time**: 2-3 hours  
**Dependencies**: Phase 1 completed  
**Validation**: TXT files generate correctly, storage integration works

### **Task 2.2: Implement MD File Generation**
- [x] **Create generateMDFile() function**
  - Convert Mindsy notes to clean Markdown
  - Maintain proper formatting and structure
  - Upload to Supabase storage in `summaries/` folder
  - Generate secure file paths
  
- [x] **Enhance markdown processing**
  - Ensure consistent formatting
  - Handle special characters and formatting
  - Optimize for readability and structure

**Estimated Time**: 2-3 hours  
**Dependencies**: Task 2.1 completed  
**Validation**: MD files generate with proper formatting

### **Task 2.3: Update Job Storage Schema**
- [x] **Update jobs table schema**
  - Add `txt_file_path` and `md_file_path` columns
  - Add `available_formats` JSONB column
  - Update existing queries to handle new columns
  
- [x] **Update job completion logic**
  - Store all generated file paths
  - Track which formats were successfully created
  - Handle partial failures gracefully

**Estimated Time**: 2 hours  
**Dependencies**: Tasks 2.1, 2.2 completed  
**Validation**: Database schema supports multi-format storage

### **Task 2.4: Create Multi-Format Orchestration**
- [ ] **Implement generateMultipleFormats() function**
  - Coordinate TXT, MD, and PDF generation
  - Handle tier-based format selection
  - Implement parallel processing where possible
  - Return comprehensive processing results
  
- [ ] **Update API response structure**
  - Include all available download links
  - Provide format-specific metadata
  - Handle different formats for different tiers

**Estimated Time**: 3-4 hours  
**Dependencies**: Tasks 2.1, 2.2, 2.3 completed  
**Validation**: Multi-format generation works for Student tier

---

## 🎯 **Phase 3: Frontend & User Experience**

### **Task 3.1: Update Account Page UI**
- [ ] **Redesign subscription section**
  - Show current plan with MB-based limits
  - Display usage progress bars for files and storage
  - List available output formats for current tier
  - Update pricing display for Student tier (€5/month)
  
- [ ] **Implement usage dashboard**
  - Real-time usage indicators
  - Monthly limit tracking
  - Clear upgrade prompts when approaching limits

**Estimated Time**: 4-5 hours  
**Dependencies**: Phase 1 completed  
**Validation**: UI accurately reflects usage and limits

### **Task 3.2: Update File Upload Flow**
- [ ] **Add client-side file size validation**
  - Check file size before upload
  - Show tier-appropriate error messages
  - Provide upgrade suggestions for oversized files
  
- [ ] **Enhance upload feedback**
  - Display file size information
  - Show remaining monthly allowance
  - Indicate which formats will be generated

**Estimated Time**: 3-4 hours  
**Dependencies**: Phase 2 completed  
**Validation**: Upload flow provides clear user feedback

### **Task 3.3: Implement Multi-Format Downloads**
- [ ] **Update download page/component**
  - Show all available formats for completed jobs
  - Provide format-specific download buttons
  - Display file sizes and descriptions
  
- [ ] **Create download API enhancements**
  - Support format-specific downloads (/api/download/[jobId]/[format])
  - Handle tier-based access control
  - Provide proper file serving and caching

**Estimated Time**: 3-4 hours  
**Dependencies**: Phase 2 completed  
**Validation**: Users can download all appropriate formats

### **Task 3.4: Update Stripe Integration UI**
- [ ] **Create Student tier upgrade flow**
  - Integrate Stripe payment link for €5/month
  - Show tier benefits clearly
  - Handle successful upgrade redirects
  
- [ ] **Update tier comparison display**
  - Clear feature comparison between Free and Student
  - Highlight value proposition (unlimited summaries, 3 formats)
  - Include usage examples and scenarios

**Estimated Time**: 2-3 hours  
**Dependencies**: Task 1.3 completed  
**Validation**: Upgrade flow works smoothly

---

## 🎯 **Phase 4: Testing & Launch Preparation**

### **Task 4.1: Comprehensive Testing**
- [ ] **End-to-end testing**
  - Free tier: 2 summaries, 60MB limit, PDF only
  - Student tier: Unlimited summaries, 300MB files, TXT+MD+PDF
  - Usage limit enforcement and tracking
  - Multi-format file generation and downloads
  
- [ ] **Payment flow testing**
  - Stripe checkout integration
  - Webhook processing
  - Tier upgrade and downgrade scenarios
  - Subscription management

**Estimated Time**: 6-8 hours  
**Dependencies**: Phases 1-3 completed  
**Validation**: All user scenarios work correctly

### **Task 4.2: Performance Optimization**
- [ ] **Database query optimization**
  - Optimize usage checking queries
  - Index optimization for new schema
  - Connection pooling and caching
  
- [ ] **File generation optimization**
  - Parallel processing for multiple formats
  - Storage upload optimization
  - Memory usage optimization for large files

**Estimated Time**: 3-4 hours  
**Dependencies**: Core functionality completed  
**Validation**: Performance benchmarks meet targets

### **Task 4.3: Error Handling & Monitoring**
- [ ] **Enhanced error handling**
  - User-friendly error messages for limit exceeded
  - Proper fallback behavior for partial failures
  - Comprehensive logging for debugging
  
- [ ] **Monitoring setup**
  - Usage metrics tracking
  - Conversion rate monitoring
  - System performance monitoring
  - Error rate alerting

**Estimated Time**: 2-3 hours  
**Dependencies**: All functionality implemented  
**Validation**: Error scenarios handled gracefully

### **Task 4.4: Documentation & Deployment**
- [ ] **User documentation**
  - Update help documentation for new tiers
  - Create upgrade guides
  - Document new file formats and features
  
- [ ] **Technical documentation**
  - API documentation updates
  - Database schema documentation
  - Deployment and rollback procedures
  
- [ ] **Production deployment**
  - Database migration scripts
  - Environment variable updates
  - Gradual rollout strategy

**Estimated Time**: 4-5 hours  
**Dependencies**: All testing completed  
**Validation**: Documentation complete, deployment successful

---

## 📊 **Implementation Timeline**

| Phase | Duration | Start After | Key Deliverables |
|-------|----------|-------------|------------------|
| **Phase 1** | 1 week | Immediate | Database schema, API integration |
| **Phase 2** | 1 week | Phase 1 | Multi-format file generation |
| **Phase 3** | 1 week | Phase 2 | Updated UI, payment flow |
| **Phase 4** | 1 week | Phase 3 | Testing, optimization, launch |

**Total Estimated Duration**: 4 weeks  
**Total Estimated Effort**: 60-75 hours  

---

## 🚨 **Critical Success Factors**

### **Must-Have Features**
- ✅ File size limits enforced at upload
- ✅ Usage tracking accurate and real-time
- ✅ Multi-format generation works reliably
- ✅ Stripe integration processes payments correctly
- ✅ Error messages guide users to upgrade

### **Performance Requirements**
- Database queries <100ms response time
- File generation <30s additional time for extra formats
- UI updates <2s for usage information
- Payment processing <10s end-to-end

### **Quality Gates**
- All automated tests pass
- No data loss during file processing
- Accurate usage tracking and billing
- Proper error handling and user feedback
- Security review passed

---

## 🔧 **Development Environment Setup**

### **Required Changes**
1. Update `.env` with Student tier Stripe price ID
2. Run database migration scripts
3. Update test data for new schema
4. Configure new storage buckets if needed

### **Testing Requirements**
- Test Stripe webhook with Student tier events
- Verify multi-format file generation
- Load test with new usage limits
- Cross-browser testing for payment flow

---

**Next Steps**: Begin with Phase 1 (Database & Backend Foundation) as it provides the foundation for all subsequent phases.