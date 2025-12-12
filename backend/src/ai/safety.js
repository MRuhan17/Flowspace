import OpenAI from 'openai';
import { logger } from '../utils/logger.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key'
});

/**
 * AI Safety & Content Moderation System
 * 
 * Inspects inputs and outputs for:
 * 1. Unsafe content (Hate, Violence, Self-harm, Sexual) via OpenAI Moderation API
 * 2. PII (Emails, Phone Numbers, Credit Cards) via Regex patterns
 */

// PII Regex Patterns
const PII_PATTERNS = {
    EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    PHONE: /(?:\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    CREDIT_CARD: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
    // SSN (Simple US pattern)
    SSN: /\b\d{3}-\d{2}-\d{4}\b/g
};

/**
 * Scan text for safety violations and PII
 * @param {string} text - The input or output text to scan
 * @param {Object} options - { checkPII: true, checkModeration: true }
 * @returns {Promise<{ isSafe: boolean, redactedText: string, flags: string[] }>}
 */
export async function scanContent(text, options = {}) {
    const { checkPII = true, checkModeration = true } = options;
    let safeText = text;
    let flags = [];
    let isSafe = true;

    // 1. Redact PII (Local Sync Check)
    if (checkPII) {
        const piiResult = redactPII(text);
        if (piiResult.found) {
            safeText = piiResult.redacted;
            flags.push('PII_DETECTED');
            // We don't necessarily fail safety for PII, we just redact it.
            // But if it's strict mode, maybe we strictly flag it. Do redaction by default.
            logger.info(`🛡️ PII Redacted from content`);
        }
    }

    // 2. OpenAI Moderation Check (Async)
    if (checkModeration) {
        try {
            const moderation = await openai.moderations.create({ input: safeText });
            const result = moderation.results[0];

            if (result.flagged) {
                isSafe = false;
                const categories = Object.keys(result.categories).filter(cat => result.categories[cat]);
                flags.push(...categories);
                logger.warn(`🛡️ Unsafe content detected: ${categories.join(', ')}`);
            }
        } catch (error) {
            logger.error('Moderation API Error', error);
            // Fail open or closed? Usually fail closed for safety.
            // For now, log and proceed but maybe flag potential issue.
            flags.push('MODERATION_API_ERROR');
        }
    }

    return {
        isSafe,
        redactedText: safeText,
        flags
    };
}

/**
 * Redact Personally Identifiable Information
 */
export function redactPII(text) {
    if (!text || typeof text !== 'string') return { found: false, redacted: text };

    let redacted = text;
    let found = false;

    // Email
    if (PII_PATTERNS.EMAIL.test(redacted)) {
        redacted = redacted.replace(PII_PATTERNS.EMAIL, '[EMAIL_REDACTED]');
        found = true;
    }

    // Phone
    if (PII_PATTERNS.PHONE.test(redacted)) {
        redacted = redacted.replace(PII_PATTERNS.PHONE, '[PHONE_REDACTED]');
        found = true;
    }

    // Credit Card
    if (PII_PATTERNS.CREDIT_CARD.test(redacted)) {
        redacted = redacted.replace(PII_PATTERNS.CREDIT_CARD, '[PAYMENT_REDACTED]');
        found = true;
    }

    // SSN
    if (PII_PATTERNS.SSN.test(redacted)) {
        redacted = redacted.replace(PII_PATTERNS.SSN, '[SSN_REDACTED]');
        found = true;
    }

    return { found, redacted };
}

/**
 * Wrapper for usage in middleware or controllers
 * Throws error if content is unsafe
 */
export async function checkAndSanitize(text) {
    const result = await scanContent(text);

    if (!result.isSafe) {
        throw new Error(`Content violated safety policies: ${result.flags.join(', ')}`);
    }

    return result.redactedText;
}

export default { scanContent, redactPII, checkAndSanitize };
