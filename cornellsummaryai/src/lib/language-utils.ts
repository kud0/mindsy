/**
 * Language-specific translations for Mindsy Notes sections
 */

export interface LanguageTerms {
  tableOfContents: string;
  cueColumn: string;
  detailedNotes: string;
  comprehensiveSummary: string;
  studyGuide: string;
}

/**
 * Language code mappings for common languages
 */
const LANGUAGE_TERMS: Record<string, LanguageTerms> = {
  // English (default)
  en: {
    tableOfContents: 'Table of Contents',
    cueColumn: 'Exam Prep Questions',
    detailedNotes: 'Detailed Notes',
    comprehensiveSummary: 'Comprehensive Summary',
    studyGuide: 'Study Guide'
  },
  
  // Spanish
  es: {
    tableOfContents: 'Tabla de Contenidos',
    cueColumn: 'Preguntas de Examen',
    detailedNotes: 'Notas Detalladas',
    comprehensiveSummary: 'Resumen',
    studyGuide: 'Guía de Estudio'
  },
  
  // French
  fr: {
    tableOfContents: 'Table des Matières',
    cueColumn: 'Questions d\'Examen',
    detailedNotes: 'Notes Détaillées',
    comprehensiveSummary: 'Résumé Complet',
    studyGuide: 'Guide d\'Étude'
  },
  
  // German
  de: {
    tableOfContents: 'Inhaltsverzeichnis',
    cueColumn: 'Prüfungsfragen',
    detailedNotes: 'Detaillierte Notizen',
    comprehensiveSummary: 'Umfassende Zusammenfassung',
    studyGuide: 'Studienführer'
  },
  
  // Italian
  it: {
    tableOfContents: 'Indice dei Contenuti',
    cueColumn: 'Domande d\'Esame',
    detailedNotes: 'Note Dettagliate',
    comprehensiveSummary: 'Riassunto Comprensivo',
    studyGuide: 'Guida allo Studio'
  },
  
  // Portuguese
  pt: {
    tableOfContents: 'Índice de Conteúdo',
    cueColumn: 'Questões de Prova',
    detailedNotes: 'Notas Detalhadas',
    comprehensiveSummary: 'Resumo Abrangente',
    studyGuide: 'Guia de Estudo'
  },
  
  // Dutch
  nl: {
    tableOfContents: 'Inhoudsopgave',
    cueColumn: 'Examenvragen',
    detailedNotes: 'Gedetailleerde Notities',
    comprehensiveSummary: 'Uitgebreide Samenvatting',
    studyGuide: 'Studiegids'
  },
  
  // Russian
  ru: {
    tableOfContents: 'Содержание',
    cueColumn: 'Экзаменационные Вопросы',
    detailedNotes: 'Подробные Заметки',
    comprehensiveSummary: 'Всеобъемлющее Резюме',
    studyGuide: 'Учебное Пособие'
  },
  
  // Chinese (Simplified)
  zh: {
    tableOfContents: '目录',
    cueColumn: '考试重点',
    detailedNotes: '详细笔记',
    comprehensiveSummary: '综合总结',
    studyGuide: '学习指南'
  },
  
  // Japanese
  ja: {
    tableOfContents: '目次',
    cueColumn: '試験対策問題',
    detailedNotes: '詳細ノート',
    comprehensiveSummary: '包括的要約',
    studyGuide: '学習ガイド'
  },
  
  // Korean
  ko: {
    tableOfContents: '목차',
    cueColumn: '시험 대비 문제',
    detailedNotes: '세부 노트',
    comprehensiveSummary: '종합 요약',
    studyGuide: '학습 가이드'
  },
  
  // Arabic
  ar: {
    tableOfContents: 'جدول المحتويات',
    cueColumn: 'أسئلة الامتحان',
    detailedNotes: 'ملاحظات مفصلة',
    comprehensiveSummary: 'ملخص شامل',
    studyGuide: 'دليل الدراسة'
  }
};

/**
 * Detect language from transcript text using improved heuristics
 * Prioritizes English detection and requires stronger evidence for other languages
 */
export function detectLanguageFromText(text: string): string {
  if (!text || text.trim().length === 0) {
    return 'en'; // Default fallback
  }
  
  const sample = text.toLowerCase().substring(0, 1000); // Use first 1000 chars for detection
  
  // Non-Latin script languages (high confidence detection)
  // Russian indicators (basic Cyrillic detection)
  if (/[а-я]/i.test(sample)) {
    return 'ru';
  }
  
  // Chinese indicators
  if (/[\u4e00-\u9fff]/.test(sample)) {
    return 'zh';
  }
  
  // Japanese indicators (hiragana, katakana, kanji)
  if (/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/.test(sample)) {
    return 'ja';
  }
  
  // Korean indicators
  if (/[\uac00-\ud7af]/.test(sample)) {
    return 'ko';
  }
  
  // Arabic indicators
  if (/[\u0600-\u06ff]/.test(sample)) {
    return 'ar';
  }
  
  // English indicators (check first for priority)
  const englishWords = (sample.match(/\b(the|and|or|but|is|are|was|were|have|has|had|will|would|could|should|can|may|this|that|these|those|with|from|they|them|their|there|where|when|what|how|who|why|business|company|management|analysis|strategy|market|financial|performance|revenue|cost|profit|investment|customer|service|product|development|team|project|organization|operations|technology|data|report|study|results|conclusion|recommendation)\b/g) || []).length;
  
  // Count occurrences of language-specific indicators
  const spanishWords = (sample.match(/\b(español|señor|señora|empresa|negocio|análisis|estrategia|mercado|financiero|ingresos|costos|beneficio|inversión|cliente|servicio|producto|desarrollo|equipo|proyecto|organización|operaciones|tecnología|datos|informe|estudio|resultados|conclusión|recomendación)\b/g) || []).length;
  const frenchWords = (sample.match(/\b(français|monsieur|madame|entreprise|affaires|analyse|stratégie|marché|financier|revenus|coûts|bénéfice|investissement|client|service|produit|développement|équipe|projet|organisation|opérations|technologie|données|rapport|étude|résultats|conclusion|recommandation)\b/g) || []).length;
  const germanWords = (sample.match(/\b(deutsch|herr|frau|unternehmen|geschäft|analyse|strategie|markt|finanziell|einnahmen|kosten|gewinn|investition|kunde|service|produkt|entwicklung|team|projekt|organisation|operationen|technologie|daten|bericht|studie|ergebnisse|schlussfolgerung|empfehlung)\b/g) || []).length;
  const italianWords = (sample.match(/\b(italiano|signore|signora|azienda|affari|analisi|strategia|mercato|finanziario|ricavi|costi|profitto|investimento|cliente|servizio|prodotto|sviluppo|squadra|progetto|organizzazione|operazioni|tecnologia|dati|rapporto|studio|risultati|conclusione|raccomandazione)\b/g) || []).length;
  const portugueseWords = (sample.match(/\b(português|senhor|senhora|empresa|negócios|análise|estratégia|mercado|financeiro|receitas|custos|lucro|investimento|cliente|serviço|produto|desenvolvimento|equipe|projeto|organização|operações|tecnologia|dados|relatório|estudo|resultados|conclusão|recomendação)\b/g) || []).length;
  
  // Require significant evidence for non-English languages (at least 3 specific words)
  if (spanishWords >= 3 && spanishWords > englishWords) {
    return 'es';
  }
  
  if (frenchWords >= 3 && frenchWords > englishWords) {
    return 'fr';
  }
  
  if (germanWords >= 3 && germanWords > englishWords) {
    return 'de';
  }
  
  if (italianWords >= 3 && italianWords > englishWords) {
    return 'it';
  }
  
  if (portugueseWords >= 3 && portugueseWords > englishWords) {
    return 'pt';
  }
  
  // Default to English for business documents and unclear cases
  return 'en';
}

/**
 * Get language-specific terms for Mindsy Notes sections
 */
export function getLanguageTerms(languageCode: string): LanguageTerms {
  // Normalize language code (handle cases like 'en-US' -> 'en')
  const normalizedCode = languageCode.toLowerCase().split('-')[0];
  
  return LANGUAGE_TERMS[normalizedCode] || LANGUAGE_TERMS.en;
}

/**
 * Get language-specific terms with fallback detection from text
 */
export function getLanguageTermsFromText(text: string, detectedLanguage?: string): {
  terms: LanguageTerms;
  language: string;
} {
  // Use detected language from RunPod if available, otherwise detect from text
  const language = detectedLanguage || detectLanguageFromText(text);
  const terms = getLanguageTerms(language);
  
  return { terms, language };
}