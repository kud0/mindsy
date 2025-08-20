# Stripe Subscription Tier System Design
## Two-Tier MVP Launch Strategy

**Document Version**: 2.0  
**Date**: July 30, 2025  
**Author**: System Architecture  

---

## 🎯 **Executive Summary**

Launch with a **simplified two-tier system** to test market demand before expanding. Focus on core value proposition: unlimited summaries and multiple file formats for paid users.

### **MVP Tier Structure**
- **Free Tier**: 2 summaries, 60MB per file, 120MB total per month, PDF only
- **Student Tier**: Unlimited summaries, 300MB per file, 700MB total per month, TXT + MD + PDF

---

## 📊 **Subscription Tier Specifications**

### **Free Plan**
```yaml
name: "Free"
price: €0.00/month
limits:
  summaries_per_month: 2
  max_file_size_mb: 60
  total_monthly_mb: 120
  concurrent_jobs: 1
features:
  - Mindsy Notes format
  - PDF download only
  - Standard processing
output_formats:
  - PDF (Mindsy Notes)
```

### **Student Plan** 
```yaml
name: "Student"
price: €5.00/month
stripe_link: "https://buy.stripe.com/test_00waEWeGda9ebuCbVEfUQ02"
limits:
  summaries_per_month: -1  # Unlimited
  max_file_size_mb: 300
  total_monthly_mb: 700
  concurrent_jobs: 2
features:
  - Mindsy Notes format
  - Multiple export formats
  - Priority processing
  - Email support
output_formats:
  - TXT (Full transcription)
  - MD (Summarized notes in Markdown)
  - PDF (Mindsy Notes formatted)
```

---

## 🏗️ **Database Schema Updates**

### **1. Update Subscription Plans Table**

```sql
-- Drop existing plans and recreate for two-tier system
DELETE FROM public.subscription_plans;

-- Update schema to use MB instead of minutes
ALTER TABLE public.subscription_plans 
  DROP COLUMN IF EXISTS max_audio_minutes_per_file,
  DROP COLUMN IF EXISTS max_audio_minutes_per_month,
  ADD COLUMN IF NOT EXISTS max_file_size_mb INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS total_monthly_mb INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS concurrent_jobs INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS output_formats JSONB DEFAULT '["pdf"]'::jsonb;

-- Insert two-tier plan configuration
INSERT INTO public.subscription_plans (
  tier, name, price_monthly, summaries_per_month, 
  max_file_size_mb, total_monthly_mb, concurrent_jobs, 
  features, output_formats
) VALUES
(
  'free', 'Free', 0.00, 2, 
  60, 120, 1,
  '["Mindsy Notes format", "PDF download only", "Standard processing"]'::jsonb,
  '["pdf"]'::jsonb
),
(
  'student', 'Student', 5.00, -1,
  300, 700, 2,
  '["Mindsy Notes format", "Multiple export formats", "Priority processing", "Email support"]'::jsonb,
  '["txt", "md", "pdf"]'::jsonb
);
```

### **2. Update Usage Tracking Table**

```sql
-- Update usage table to track MB instead of minutes
ALTER TABLE public.usage 
  DROP COLUMN IF EXISTS audio_minutes_used,
  ADD COLUMN IF NOT EXISTS total_mb_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS files_processed INTEGER DEFAULT 0;

-- Add index for efficient monthly queries
CREATE INDEX IF NOT EXISTS idx_usage_monthly_totals 
ON public.usage(user_id, month_year, total_mb_used);
```

### **3. Enhanced Usage Limit Function**

```sql
-- Enhanced function to check both file size and monthly MB limits
CREATE OR REPLACE FUNCTION public.check_usage_limits(
  p_user_id UUID, 
  p_file_size_mb INTEGER DEFAULT 0
)
RETURNS TABLE(
  can_process BOOLEAN, 
  message TEXT,
  current_usage_mb INTEGER,
  monthly_limit_mb INTEGER,
  files_this_month INTEGER,
  summary_limit INTEGER,
  user_tier TEXT,
  available_formats JSONB
) AS $$
DECLARE
  v_subscription_tier subscription_tier;
  v_current_mb_usage INTEGER;
  v_current_file_count INTEGER;
  v_monthly_mb_limit INTEGER;
  v_file_size_limit INTEGER;
  v_summary_limit INTEGER;
  v_output_formats JSONB;
  v_month_year TEXT;
BEGIN
  -- Get current month (YYYY-MM format)
  v_month_year := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_subscription_tier
  FROM public.profiles WHERE id = p_user_id;
  
  -- Default to free if null
  IF v_subscription_tier IS NULL THEN
    v_subscription_tier := 'free';
  END IF;
  
  -- Get current month's usage
  SELECT 
    COALESCE(total_mb_used, 0),
    COALESCE(files_processed, 0)
  INTO v_current_mb_usage, v_current_file_count
  FROM public.usage 
  WHERE user_id = p_user_id AND month_year = v_month_year;
  
  -- Get plan limits
  SELECT 
    summaries_per_month,
    max_file_size_mb,
    total_monthly_mb,
    output_formats
  INTO v_summary_limit, v_file_size_limit, v_monthly_mb_limit, v_output_formats
  FROM public.subscription_plans
  WHERE tier = v_subscription_tier;
  
  -- Check file size limit
  IF p_file_size_mb > v_file_size_limit THEN
    RETURN QUERY SELECT 
      FALSE, 
      format('File size %sMB exceeds limit of %sMB for %s tier', 
             p_file_size_mb, v_file_size_limit, v_subscription_tier),
      v_current_mb_usage,
      v_monthly_mb_limit,
      v_current_file_count,
      v_summary_limit,
      v_subscription_tier::TEXT,
      v_output_formats;
    RETURN;
  END IF;
  
  -- Check monthly MB limit
  IF (v_current_mb_usage + p_file_size_mb) > v_monthly_mb_limit THEN
    RETURN QUERY SELECT 
      FALSE,
      format('Adding %sMB would exceed monthly limit of %sMB (%sMB used)', 
             p_file_size_mb, v_monthly_mb_limit, v_current_mb_usage),
      v_current_mb_usage,
      v_monthly_mb_limit,
      v_current_file_count,
      v_summary_limit,
      v_subscription_tier::TEXT,
      v_output_formats;
    RETURN;
  END IF;
  
  -- Check summary count limit (for free tier)
  IF v_summary_limit != -1 AND v_current_file_count >= v_summary_limit THEN
    RETURN QUERY SELECT 
      FALSE,
      format('Monthly limit of %s summaries reached', v_summary_limit),
      v_current_mb_usage,
      v_monthly_mb_limit,
      v_current_file_count,
      v_summary_limit,
      v_subscription_tier::TEXT,
      v_output_formats;
    RETURN;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT 
    TRUE,
    'Within all limits',
    v_current_mb_usage,
    v_monthly_mb_limit,
    v_current_file_count,
    v_summary_limit,
    v_subscription_tier::TEXT,
    v_output_formats;
END;
$$ LANGUAGE plpgsql;
```

### **4. Usage Tracking Function**

```sql
-- Function to increment usage after successful processing
CREATE OR REPLACE FUNCTION public.track_usage(
  p_user_id UUID, 
  p_file_size_mb INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_month_year TEXT;
BEGIN
  v_month_year := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Upsert usage record
  INSERT INTO public.usage (user_id, month_year, total_mb_used, files_processed)
  VALUES (p_user_id, v_month_year, p_file_size_mb, 1)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET
    total_mb_used = usage.total_mb_used + p_file_size_mb,
    files_processed = usage.files_processed + 1,
    updated_at = NOW();
    
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔧 **API Integration Points**

### **1. Enhanced File Processing with Multiple Formats**

**Location**: `src/pages/api/generate.ts`

```typescript
interface ProcessingResult {
  formats: {
    txt?: string;    // Full transcription text
    md?: string;     // Markdown summary  
    pdf: string;     // PDF file path (always included)
  };
  availableDownloads: string[];
}

async function generateMultipleFormats(
  transcription: string,
  cornellNotes: string,
  lectureTitle: string,
  userTier: string,
  supabase: any
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    formats: { pdf: '' },
    availableDownloads: []
  };
  
  // Always generate PDF (for all tiers)
  const pdfPath = await generatePDF(cornellNotes, lectureTitle);
  result.formats.pdf = pdfPath;
  result.availableDownloads.push('pdf');
  
  // Generate additional formats for Student tier
  if (userTier === 'student') {
    // Generate TXT file (full transcription)
    const txtPath = await generateTXTFile(transcription, lectureTitle, supabase);
    result.formats.txt = txtPath;
    result.availableDownloads.push('txt');
    
    // Generate MD file (summary)
    const mdPath = await generateMDFile(cornellNotes, lectureTitle, supabase);
    result.formats.md = mdPath;
    result.availableDownloads.push('md');
  }
  
  return result;
}

async function generateTXTFile(
  transcription: string, 
  lectureTitle: string,
  supabase: any
): Promise<string> {
  const fileName = `${lectureTitle.replace(/[^a-zA-Z0-9]/g, '_')}_transcription.txt`;
  const filePath = `transcriptions/${fileName}`;
  
  // Upload TXT content to storage
  const { error } = await supabase.storage
    .from('generated-notes')
    .upload(filePath, new Blob([transcription], { type: 'text/plain' }), {
      cacheControl: '3600',
      upsert: false
    });
    
  if (error) throw error;
  return filePath;
}

async function generateMDFile(
  cornellNotes: string,
  lectureTitle: string, 
  supabase: any
): Promise<string> {
  const fileName = `${lectureTitle.replace(/[^a-zA-Z0-9]/g, '_')}_summary.md`;
  const filePath = `summaries/${fileName}`;
  
  // Upload MD content to storage
  const { error } = await supabase.storage
    .from('generated-notes')
    .upload(filePath, new Blob([cornellNotes], { type: 'text/markdown' }), {
      cacheControl: '3600',
      upsert: false
    });
    
  if (error) throw error;
  return filePath;
}
```

### **2. Updated Generate API Flow**

```typescript
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // ... existing auth code ...
    
    const { audioFilePath, pdfFilePath, lectureTitle } = await request.json();
    
    // STEP 1: Validate file upload limits
    const validation = await validateFileUpload(user.id, audioFilePath, supabase);
    
    if (!validation.isValid) {
      return new Response(JSON.stringify({
        error: 'Upload Limit Exceeded',
        message: validation.errorMessage,
        usage: validation.usage,
        upgradeUrl: '/dashboard/account#subscription'
      }), { 
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // ... existing processing code (transcription, note generation) ...
    
    // STEP 2: Generate multiple formats based on user tier
    const processingResult = await generateMultipleFormats(
      transcription,
      cornellNotes,
      lectureTitle,
      validation.usage!.userTier,
      supabase
    );
    
    // STEP 3: Update job record with all generated files
    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        result_file_path: processingResult.formats.pdf,
        txt_file_path: processingResult.formats.txt || null,
        md_file_path: processingResult.formats.md || null,
        available_formats: processingResult.availableDownloads,
        completed_at: new Date().toISOString()
      })
      .eq('id', job.id);
    
    // STEP 4: Track usage
    await trackFileUsage(user.id, validation.fileSizeMB, supabase);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Mindsy Notes generated successfully',
      jobId: job.id,
      downloads: {
        pdf: processingResult.formats.pdf,
        txt: processingResult.formats.txt,
        md: processingResult.formats.md
      },
      availableFormats: processingResult.availableDownloads,
      usage: {
        mbUsedThisMonth: validation.usage!.currentUsageMB + validation.fileSizeMB,
        monthlyLimitMB: validation.usage!.monthlyLimitMB,
        filesProcessedThisMonth: validation.usage!.filesThisMonth + 1
      }
    }));
    
  } catch (error) {
    // ... existing error handling ...
  }
};
```

---

## 📱 **Frontend Integration**

### **1. Updated Account Page Usage Display**

```typescript
// Update src/pages/dashboard/account.astro usage display
async function loadUsageInfo() {
  const monthYear = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  
  // Get current usage
  const { data: usage } = await supabase
    .from('usage')
    .select('total_mb_used, files_processed')
    .eq('user_id', userId)
    .eq('month_year', monthYear)
    .single();
    
  // Get plan limits
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('total_monthly_mb, max_file_size_mb, summaries_per_month, output_formats')
    .eq('tier', profile.subscription_tier || 'free')
    .single();
    
  // Update UI
  const usageElement = document.getElementById('usage-info');
  const currentMB = usage?.total_mb_used || 0;
  const limitMB = plan?.total_monthly_mb || 120;
  const filesUsed = usage?.files_processed || 0;
  const fileLimit = plan?.summaries_per_month === -1 ? '∞' : plan?.summaries_per_month;
  const formats = plan?.output_formats || ['pdf'];
  
  usageElement.innerHTML = `
    <div class="space-y-3">
      <div class="flex justify-between">
        <span>Files processed:</span>
        <span class="font-medium">${filesUsed} / ${fileLimit}</span>
      </div>
      <div class="flex justify-between">
        <span>Storage used:</span>
        <span class="font-medium">${currentMB}MB / ${limitMB}MB</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div class="bg-blue-600 h-2 rounded-full" 
             style="width: ${Math.min(100, (currentMB / limitMB) * 100)}%"></div>
      </div>
      <div class="text-sm text-gray-600">
        <span>Available formats: ${formats.map(f => f.toUpperCase()).join(', ')}</span>
      </div>
    </div>
  `;
}
```

### **2. Updated Subscription Plans Display**

```html
<!-- Update subscription section in account page -->
<div class="bg-white shadow rounded-lg p-6 mt-6">
  <h2 class="text-xl font-semibold text-gray-900 mb-4">Subscription</h2>
  
  <!-- Current Plan -->
  <div class="mb-6 p-4 bg-gray-50 rounded-lg">
    <h3 class="text-lg font-medium text-gray-900 mb-2">Current Plan</h3>
    <div class="flex items-center justify-between">
      <div>
        <p id="current-plan" class="text-2xl font-bold text-gray-900">Free</p>
        <p id="plan-features" class="text-sm text-gray-600">2 summaries per month • Up to 60MB per file • PDF only</p>
      </div>
      <span id="plan-price" class="text-sm text-gray-500">€0/month</span>
    </div>
  </div>

  <!-- Available Plans -->
  <h3 class="text-lg font-medium text-gray-900 mb-4">Available Plans</h3>
  <div class="space-y-4">
    <!-- Student Plan -->
    <div class="border rounded-lg p-4 hover:border-blue-500 transition-colors">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="font-medium text-gray-900">Student</h4>
          <p class="text-sm text-gray-600">Unlimited summaries • Up to 300MB per file • 700MB monthly • TXT + MD + PDF</p>
        </div>
        <div class="text-right">
          <p class="text-lg font-bold">€5<span class="text-sm font-normal text-gray-600">/month</span></p>
          <button id="upgrade-student-btn" class="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition">
            Upgrade
          </button>
        </div>
      </div>
    </div>
  </div>

  <p class="mt-6 text-sm text-gray-500 text-center">
    Need help choosing? <a href="mailto:support@mysummary.app" class="text-blue-600 hover:underline">Contact support</a>
  </p>
</div>
```

---

## 🚀 **Simplified Implementation Roadmap**

### **Phase 1: Database & Backend (Week 1)**
- [ ] Update subscription_plans table with two-tier structure
- [ ] Update usage tracking table and functions
- [ ] Test database functions with sample data
- [ ] Create Stripe payment link for Student tier (€5)

### **Phase 2: Multi-Format Generation (Week 2)**
- [ ] Implement TXT file generation from transcription
- [ ] Implement MD file generation from Mindsy notes
- [ ] Update API to generate multiple formats based on tier
- [ ] Test file generation and storage

### **Phase 3: Frontend & UX (Week 3)**
- [ ] Update account page with two-tier display
- [ ] Add file format indicators in UI
- [ ] Implement download links for multiple formats
- [ ] Update upgrade flow for Student tier

### **Phase 4: Testing & Launch (Week 4)**
- [ ] End-to-end testing of both tiers
- [ ] Payment flow testing
- [ ] Load testing with file generation
- [ ] MVP launch preparation

---

## 🔍 **Error Handling & User Experience**

### **Error Response Format**
```json
{
  "error": "Upload Limit Exceeded",
  "message": "File size 80MB exceeds limit of 60MB for free tier",
  "errorCode": "FILE_SIZE_EXCEEDED",
  "usage": {
    "currentUsageMB": 45,
    "monthlyLimitMB": 120,
    "filesThisMonth": 1,
    "remainingMB": 75
  },
  "upgradeUrl": "/dashboard/account#subscription",
  "suggestedAction": "Upgrade to Student Plan for €5/month - unlimited summaries and more storage"
}
```

### **User-Friendly Messages**
- **File too large**: "Your {size}MB file exceeds the {limit}MB limit. Upgrade to Student Plan for 300MB files and unlimited summaries."
- **Monthly limit reached**: "You've used {used}MB of your {limit}MB monthly allowance. Upgrade to Student Plan for more storage."
- **Summary limit reached**: "You've created 2 summaries this month. Upgrade to Student Plan for unlimited summaries."

---

## 📊 **Success Metrics for MVP**

### **Technical KPIs**
- [ ] File processing success rate >95%
- [ ] Multiple format generation <30s additional time
- [ ] Database query performance <100ms
- [ ] Zero data loss during processing
- [ ] Payment conversion flow >90% completion

### **Business KPIs**
- [ ] Free to Student conversion rate (target: 5-10%)
- [ ] Monthly churn rate <5%
- [ ] Support ticket reduction (clearer pricing)
- [ ] User engagement with multiple file formats
- [ ] Average revenue per user (ARPU) tracking

### **User Experience KPIs**
- [ ] Clear understanding of tier benefits
- [ ] Smooth upgrade experience
- [ ] File download success rate >98%
- [ ] User satisfaction with file formats
- [ ] Reduced confusion about pricing

---

## 🌱 **Future Expansion Strategy**

### **Potential Third Tier (After MVP Success)**
```yaml
name: "Professional"
price: €15.00/month
limits:
  summaries_per_month: -1
  max_file_size_mb: 500
  total_monthly_mb: 2000
features:
  - All Student features
  - API access
  - Batch processing
  - Custom templates
  - Priority support
output_formats:
  - TXT, MD, PDF, DOCX, HTML
```

### **Feature Expansion Ideas**
- Custom Mindsy note templates
- Integration with learning management systems
- Team/organization accounts
- Advanced AI models
- Multi-language support

---

**Document Status**: ✅ MVP Ready - Two-Tier Launch Strategy**