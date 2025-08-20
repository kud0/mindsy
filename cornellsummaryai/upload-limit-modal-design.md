# Upload Limit Modal Design & Implementation

## 🎯 Problem Analysis

**Current State**: Generic "Failed to upload files" message provides no context or actionable guidance.

**User Pain Points**:
- No explanation of WHY upload failed
- No guidance on what to do next
- Confusing technical messages from API
- No upgrade path visibility

## 🎨 Modal Design Specification

### Visual Design
- **Clean, friendly modal** with clear hierarchy
- **Icon-based messaging** for quick recognition
- **Action-oriented buttons** with clear next steps
- **Contextual colors**: Warning (amber) for limits, not error red

### Modal Structure
```
┌─────────────────────────────────────┐
│  [Icon] Upload Limit Reached        │
│                                     │
│  Your file is too large for your    │
│  current plan.                      │
│                                     │
│  File size: 150MB                   │
│  Your limit: 60MB per file          │
│                                     │
│  [Future: Upgrade Plan] [Try Another File] │
└─────────────────────────────────────┘
```

## 🚀 Implementation Plan

### 1. Create Modal Component

**File**: `src/components/UploadLimitModal.astro`

```astro
---
interface Props {
  isOpen: boolean;
  limitType: 'fileSize' | 'monthlyQuota' | 'summaryCount';
  currentUsage?: number;
  limit?: number;
  fileSize?: number;
  tier: 'free' | 'student';
  lang: 'en' | 'es';
}

const { isOpen, limitType, currentUsage, limit, fileSize, tier, lang } = Astro.props;
---

<!-- Modal Backdrop -->
<div 
  id="upload-limit-modal" 
  class={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${isOpen ? '' : 'hidden'}`}
>
  <!-- Modal Content -->
  <div class="bg-white rounded-xl p-8 max-w-md mx-4 shadow-2xl">
    <!-- Icon & Title -->
    <div class="text-center mb-6">
      <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 class="text-xl font-semibold text-gray-900" id="modal-title">
        <!-- Dynamic title based on limitType -->
      </h3>
    </div>

    <!-- Dynamic Content -->
    <div class="text-center text-gray-600 mb-8" id="modal-content">
      <!-- Dynamic content based on limitType and tier -->
    </div>

    <!-- Action Buttons -->
    <div class="flex flex-col sm:flex-row gap-3" id="modal-actions">
      <!-- Dynamic buttons based on tier and context -->
    </div>
  </div>
</div>
```

### 2. Enhanced Error Detection

**Update**: `src/pages/dashboard/index.astro` and `src/pages/es/dashboard/index.astro`

```javascript
// Enhanced error handling in form submission
async function handleUploadError(error, response) {
  let errorData;
  
  try {
    errorData = await response.json();
  } catch (e) {
    // Fallback for non-JSON responses
    showUploadLimitModal('generic', null, null, null, currentUserTier);
    return;
  }

  // Parse error details for limit scenarios
  if (response.status === 429 && errorData.details) {
    const details = errorData.details;
  
    if (errorData.error.includes('File size') && errorData.error.includes('exceeds limit')) {
      // File too large for tier
      showUploadLimitModal('fileSize', details.currentUsageMB, details.monthlyLimitMB, calculateFileSizeMB(audioFile), currentUserTier);
    } 
    else if (errorData.error.includes('exceed monthly limit')) {
      // Monthly quota exceeded
      showUploadLimitModal('monthlyQuota', details.currentUsageMB, details.monthlyLimitMB, calculateFileSizeMB(audioFile), currentUserTier);
    }
    else if (errorData.error.includes('summary limit')) {
      // Summary count exceeded (Free tier)
      showUploadLimitModal('summaryCount', details.filesThisMonth, details.summaryLimit, null, currentUserTier);
    }
  } else {
    // Generic error fallback
    showUploadLimitModal('generic', null, null, null, currentUserTier);
  }
}

// Replace the generic error handling:
// OLD: uploadError.textContent = "Failed to upload files. Please try again.";
// NEW: handleUploadError(error, uploadResponse);
```

### 3. Modal Logic Functions

```javascript
function showUploadLimitModal(limitType, currentUsage, limit, fileSize, tier) {
  const modal = document.getElementById('upload-limit-modal');
  const title = document.getElementById('modal-title');
  const content = document.getElementById('modal-content');
  const actions = document.getElementById('modal-actions');
  
  // Get translations based on current page language
  const t = getTranslations(); // Helper function to get translations
  
  switch(limitType) {
    case 'fileSize':
      title.textContent = t('modal.fileSize.title');
      content.innerHTML = `
        <p class="mb-4">${t('modal.fileSize.description')}</p>
        <div class="bg-gray-50 rounded-lg p-4 text-sm">
          <div class="flex justify-between mb-2">
            <span>${t('modal.fileSize.current')}:</span>
            <span class="font-semibold">${fileSize}MB</span>
          </div>
          <div class="flex justify-between">
            <span>${t('modal.fileSize.limit')}:</span>
            <span class="font-semibold">${tier === 'free' ? '60' : '300'}MB</span>
          </div>
        </div>
      `;
      actions.innerHTML = getActionButtons(tier, 'fileSize');
      break;
      
    case 'monthlyQuota':
      title.textContent = t('modal.monthlyQuota.title');
      content.innerHTML = `
        <p class="mb-4">${t('modal.monthlyQuota.description')}</p>
        <div class="bg-gray-50 rounded-lg p-4 text-sm">
          <div class="flex justify-between mb-2">
            <span>${t('modal.monthlyQuota.used')}:</span>
            <span class="font-semibold">${currentUsage}MB</span>
          </div>
          <div class="flex justify-between mb-2">
            <span>${t('modal.monthlyQuota.adding')}:</span>
            <span class="font-semibold">+${fileSize}MB</span>
          </div>
          <div class="flex justify-between border-t pt-2">
            <span>${t('modal.monthlyQuota.limit')}:</span>
            <span class="font-semibold">${limit}MB</span>
          </div>
        </div>
      `;
      actions.innerHTML = getActionButtons(tier, 'monthlyQuota');
      break;
      
    case 'summaryCount':
      title.textContent = t('modal.summaryCount.title');
      content.innerHTML = `
        <p class="mb-4">${t('modal.summaryCount.description')}</p>
        <div class="bg-gray-50 rounded-lg p-4 text-sm">
          <div class="flex justify-between">
            <span>${t('modal.summaryCount.used')}:</span>
            <span class="font-semibold">${currentUsage} / ${limit}</span>
          </div>
        </div>
      `;
      actions.innerHTML = getActionButtons(tier, 'summaryCount');
      break;
      
    default:
      title.textContent = t('modal.generic.title');
      content.innerHTML = `<p>${t('modal.generic.description')}</p>`;
      actions.innerHTML = getActionButtons(tier, 'generic');
  }
  
  modal.classList.remove('hidden');
}

function getActionButtons(tier, limitType) {
  const t = getTranslations();
  
  if (tier === 'free') {
    // Free users - show future upgrade option
    return `
      <button 
        onclick="closeUploadLimitModal()" 
        class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
      >
        ${t('modal.actions.tryAnother')}
      </button>
      <button 
        onclick="showUpgradeInfo()" 
        class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        ${t('modal.actions.learnUpgrade')}
      </button>
    `;
  } else {
    // Student users - show support contact
    return `
      <button 
        onclick="closeUploadLimitModal()" 
        class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
      >
        ${t('modal.actions.tryAnother')}
      </button>
      <button 
        onclick="contactSupport()" 
        class="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
      >
        ${t('modal.actions.contactSupport')}
      </button>
    `;
  }
}

function closeUploadLimitModal() {
  document.getElementById('upload-limit-modal').classList.add('hidden');
}

function showUpgradeInfo() {
  closeUploadLimitModal();
  // Future: Show upgrade information
  alert('Upgrade information will be available when user testing begins!');
}

function contactSupport() {
  closeUploadLimitModal();
  window.open('mailto:support@mysummary.app?subject=Storage Limit Question', '_blank');
}
```

### 4. Translation Additions

**Add to**: `src/lib/i18n.ts`

```typescript
// Modal translations
'modal.fileSize.title': 'File Too Large',
'modal.fileSize.description': 'The file you\'re trying to upload exceeds the size limit for your plan.',
'modal.fileSize.current': 'File size',
'modal.fileSize.limit': 'Your limit',

'modal.monthlyQuota.title': 'Monthly Limit Reached',
'modal.monthlyQuota.description': 'Adding this file would exceed your monthly storage allowance.',
'modal.monthlyQuota.used': 'Currently used',
'modal.monthlyQuota.adding': 'This file',
'modal.monthlyQuota.limit': 'Monthly limit',

'modal.summaryCount.title': 'Summary Limit Reached', 
'modal.summaryCount.description': 'You\'ve reached your monthly summary limit.',
'modal.summaryCount.used': 'Summaries created',

'modal.generic.title': 'Upload Failed',
'modal.generic.description': 'We couldn\'t process your upload. Please try again or contact support if the problem persists.',

'modal.actions.tryAnother': 'Try Another File',
'modal.actions.learnUpgrade': 'Learn About Plans',
'modal.actions.contactSupport': 'Contact Support',

// Spanish translations
'modal.fileSize.title': 'Archivo Demasiado Grande',
'modal.fileSize.description': 'El archivo que intentas subir excede el límite de tamaño para tu plan.',
'modal.fileSize.current': 'Tamaño del archivo',
'modal.fileSize.limit': 'Tu límite',

'modal.monthlyQuota.title': 'Límite Mensual Alcanzado',
'modal.monthlyQuota.description': 'Agregar este archivo excedería tu límite mensual de almacenamiento.',
'modal.monthlyQuota.used': 'Actualmente usado',
'modal.monthlyQuota.adding': 'Este archivo',
'modal.monthlyQuota.limit': 'Límite mensual',

'modal.summaryCount.title': 'Límite de Resúmenes Alcanzado',
'modal.summaryCount.description': 'Has alcanzado tu límite mensual de resúmenes.',
'modal.summaryCount.used': 'Resúmenes creados',

'modal.generic.title': 'Error al Subir',
'modal.generic.description': 'No pudimos procesar tu archivo. Inténtalo de nuevo o contacta soporte si el problema persiste.',

'modal.actions.tryAnother': 'Probar Otro Archivo',
'modal.actions.learnUpgrade': 'Conocer Planes',
'modal.actions.contactSupport': 'Contactar Soporte',
```

## 🎯 User Experience Improvements

### Before (Current)
```
❌ "Failed to upload files. Please try again."
```

### After (Improved)
```
⚠️  File Too Large
    The file you're trying to upload exceeds the size limit for your plan.
    
    File size: 150MB  
    Your limit: 60MB
    
    [Try Another File] [Learn About Plans]
```

## 📱 Mobile-First Design

- **Responsive modal** that works on all screen sizes
- **Touch-friendly buttons** with adequate spacing  
- **Clear visual hierarchy** with icons and typography
- **Accessible focus management** for keyboard navigation

## 🚀 Implementation Priority

1. **Phase 1**: Create modal component and basic error detection
2. **Phase 2**: Integrate with existing dashboard error handling
3. **Phase 3**: Add Spanish translations and testing
4. **Phase 4**: Future upgrade flow integration (when user testing begins)

This design transforms the frustrating "Failed to upload" experience into a helpful, actionable dialog that guides users toward solutions rather than leaving them confused.