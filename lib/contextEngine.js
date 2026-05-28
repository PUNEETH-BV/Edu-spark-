// ═══════════════════════════════════════════════════════════════════════════════
// contextEngine.js — Shared AI Context Engine for Edu Spark
// ═══════════════════════════════════════════════════════════════════════════════
// This is the "brain" of the shared knowledge layer.
// ALL AI tools (Quiz, Podcast, Flashcards, Mind Map, Notes, Chat)
// connect through this single retrieval + context system.
//
// Architecture:
//   Sources → chunkContent() → buildAIContext() → Tool Prompt → Gemini → Output
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Chunk text into smaller pieces with metadata for retrieval.
 * Uses a sliding window approach with overlap for context preservation.
 *
 * @param {string} text - The full text content to chunk
 * @param {object} options - Chunking options
 * @param {string} options.source - Source name (e.g. "Operating Systems.pdf")
 * @param {string} options.chapter - Chapter name if available
 * @param {number} options.chunkSize - Max characters per chunk (default 1500)
 * @param {number} options.overlap - Character overlap between chunks (default 200)
 * @returns {Array<Chunk>} Array of chunk objects
 */
export function chunkContent(text, options = {}) {
  const {
    source = 'Unknown Source',
    chapter = '',
    chunkSize = 1500,
    overlap = 200,
  } = options;

  if (!text || text.trim().length === 0) return [];

  const cleanText = text.trim();

  // If text is small enough, return as single chunk
  if (cleanText.length <= chunkSize) {
    return [{
      text: cleanText,
      source,
      chapter,
      page: 1,
      chunkIndex: 0,
      timestamp: null,
    }];
  }

  // Split by paragraphs first for natural boundaries
  const paragraphs = cleanText.split(/\n\s*\n/);
  const chunks = [];
  let currentChunk = '';
  let currentPage = 1;
  let chunkIndex = 0;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // If adding this paragraph exceeds chunk size, save current and start new
    if (currentChunk.length + trimmed.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        source,
        chapter,
        page: currentPage,
        chunkIndex,
        timestamp: null,
      });
      // Keep overlap from end of current chunk
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + '\n\n' + trimmed;
      currentPage++;
      chunkIndex++;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      source,
      chapter,
      page: currentPage,
      chunkIndex,
      timestamp: null,
    });
  }

  return chunks;
}

/**
 * Build segment-based chunks from video segments.
 * Each segment becomes a chunk with timestamp metadata.
 *
 * @param {Array} segments - Array of segment objects with title, topics, start_time, end_time
 * @param {string} videoTitle - Title of the video
 * @returns {Array<Chunk>} Array of chunk objects with timestamps
 */
export function buildSegmentChunks(segments, videoTitle) {
  if (!segments || segments.length === 0) return [];

  return segments.map((seg, idx) => {
    const topicText = (seg.topics || []).join(', ');
    const text = `Chapter: ${seg.title || `Section ${idx + 1}`}\nTopics: ${topicText}`;
    const startMin = Math.floor((seg.start_time || seg.start || 0) / 60);
    const startSec = Math.floor((seg.start_time || seg.start || 0) % 60);

    return {
      text,
      source: videoTitle,
      chapter: seg.title || `Section ${idx + 1}`,
      page: idx + 1,
      chunkIndex: idx,
      timestamp: `${String(startMin).padStart(2, '0')}:${String(startSec).padStart(2, '0')}`,
    };
  });
}

/**
 * Build the shared AIContext object that ALL tools receive.
 * This is the single source of truth for context.
 *
 * @param {object} params
 * @param {string} params.courseId - Course/video ID
 * @param {object} params.video - Video/course record from Supabase
 * @param {Array} params.segments - Segments/chapters array
 * @param {Array} params.selectedSources - Additional selected source records
 * @param {object} params.options - Tool-specific options
 * @returns {AIContext} The shared context object
 */
export function buildAIContext({ courseId, video, segments, selectedSources = [], options = {} }) {
  const contentChunks = [];

  // 1. Chunk the main course content (from uploaded PDFs, pasted text, etc.)
  if (video?.content) {
    const mainChunks = chunkContent(video.content, {
      source: video.title || 'Main Source',
      chapter: '',
      chunkSize: 2000,
    });
    contentChunks.push(...mainChunks);
  }

  // 2. Build chunks from video segments
  if (segments && segments.length > 0) {
    const segChunks = buildSegmentChunks(segments, video?.title || 'Video');
    contentChunks.push(...segChunks);
  }

  // 3. Add selected sources content
  for (const src of selectedSources) {
    if (src.content) {
      const srcChunks = chunkContent(src.content, {
        source: src.title || src.url || 'Additional Source',
        chapter: '',
        chunkSize: 2000,
      });
      contentChunks.push(...srcChunks);
    }
  }

  // Build the segment summary string
  const segmentSummary = (segments || [])
    .map(s => `- ${s.title}: ${(s.topics || []).join(', ')}`)
    .join('\n');

  return {
    courseId: courseId || video?.id,
    videoTitle: video?.title || 'Untitled Course',
    subject: video?.subject || 'General',
    contentChunks,
    segmentSummary,
    difficulty: options.difficulty || 'medium',
    activeChapter: options.activeChapter || null,
    selectedSources: selectedSources.map(s => ({
      id: s.id,
      title: s.title,
      url: s.url,
      platform: s.platform,
    })),
  };
}

/**
 * Get the full relevant content string for prompt injection.
 * Concatenates all chunks into a formatted string with citations.
 *
 * @param {AIContext} context - The shared context object
 * @param {number} maxLength - Maximum content length (default 15000 chars)
 * @returns {string} Formatted content string with source citations
 */
export function getRelevantContent(context, maxLength = 15000) {
  if (!context.contentChunks || context.contentChunks.length === 0) {
    return context.segmentSummary || 'No source material available.';
  }

  let result = '';
  let totalLen = 0;

  for (const chunk of context.contentChunks) {
    const citation = formatChunkCitation(chunk);
    const entry = `${citation}\n${chunk.text}\n\n`;

    if (totalLen + entry.length > maxLength) break;
    result += entry;
    totalLen += entry.length;
  }

  // If we have segment summary and still have room, append it
  if (context.segmentSummary && totalLen < maxLength - 500) {
    result += `\n--- Course Structure ---\n${context.segmentSummary}\n`;
  }

  return result || 'No source material available.';
}

/**
 * Format a chunk's citation metadata.
 *
 * @param {Chunk} chunk
 * @returns {string} Citation string like [Source: "OS.pdf", Page 3, 00:14:22]
 */
export function formatChunkCitation(chunk) {
  const parts = [`Source: "${chunk.source}"`];
  if (chunk.page) parts.push(`Section ${chunk.page}`);
  if (chunk.chapter) parts.push(`Chapter: ${chunk.chapter}`);
  if (chunk.timestamp) parts.push(`Timestamp: ${chunk.timestamp}`);
  return `[${parts.join(' | ')}]`;
}

/**
 * Format all source citations for output metadata.
 *
 * @param {Array<Chunk>} chunks
 * @returns {Array} Unique citation objects
 */
export function formatSourceCitations(chunks) {
  const seen = new Set();
  const citations = [];

  for (const chunk of chunks) {
    const key = `${chunk.source}:${chunk.page}`;
    if (seen.has(key)) continue;
    seen.add(key);

    citations.push({
      source: chunk.source,
      page: chunk.page,
      timestamp: chunk.timestamp || null,
      chapter: chunk.chapter || null,
    });
  }

  return citations;
}
