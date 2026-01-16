/**
 * Conversation Service
 * Manages conversation sessions and history
 * 
 * Phase 7: In-memory session management (can be migrated to Redis later)
 */

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ConversationSession {
  conversationId: string;
  userId: string;
  messages: ConversationMessage[];
  createdAt: Date;
  lastActivity: Date;
}

/**
 * In-memory storage for conversation sessions
 * TODO: Migrate to Redis for production scalability
 */
class ConversationService {
  private sessions: Map<string, ConversationSession> = new Map();
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval to remove expired sessions
    this.startCleanupInterval();
  }

  /**
   * Get or create a conversation session
   */
  getOrCreateSession(
    userId: string,
    conversationId?: string
  ): ConversationSession {
    // If conversationId provided, try to retrieve existing session
    if (conversationId) {
      const existing = this.sessions.get(conversationId);
      if (existing && existing.userId === userId) {
        // Update last activity
        existing.lastActivity = new Date();
        return existing;
      }
      // If conversationId doesn't match user or doesn't exist, create new
    }

    // Create new session
    const newConversationId = this.generateConversationId();
    const session: ConversationSession = {
      conversationId: newConversationId,
      userId,
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.sessions.set(newConversationId, session);
    return session;
  }

  /**
   * Get conversation history for a session
   * Returns messages in format expected by agent (without timestamps)
   */
  getConversationHistory(conversationId: string): Array<{ role: 'user' | 'assistant'; content: string }> {
    const session = this.sessions.get(conversationId);
    if (!session) {
      return [];
    }

    // Update last activity
    session.lastActivity = new Date();

    // Return messages in format expected by agent (without timestamps)
    return session.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Add a message to the conversation
   */
  addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string
  ): void {
    const session = this.sessions.get(conversationId);
    if (!session) {
      throw new Error(`Conversation session not found: ${conversationId}`);
    }

    session.messages.push({
      role,
      content,
      timestamp: new Date(),
    });

    session.lastActivity = new Date();
  }

  /**
   * Get session by ID
   */
  getSession(conversationId: string): ConversationSession | undefined {
    return this.sessions.get(conversationId);
  }

  /**
   * Delete a session
   */
  deleteSession(conversationId: string): boolean {
    return this.sessions.delete(conversationId);
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expired: string[] = [];

    for (const [id, session] of this.sessions.entries()) {
      const timeSinceActivity = now.getTime() - session.lastActivity.getTime();
      if (timeSinceActivity > this.SESSION_TIMEOUT_MS) {
        expired.push(id);
      }
    }

    for (const id of expired) {
      this.sessions.delete(id);
    }

    if (expired.length > 0 && process.env.NODE_ENV === 'development') {
      console.log(`[CONVERSATION SERVICE] Cleaned up ${expired.length} expired sessions`);
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop cleanup interval (for testing)
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Generate a unique conversation ID
   */
  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get statistics (for monitoring)
   */
  getStats(): {
    totalSessions: number;
    activeSessions: number;
  } {
    const now = new Date();
    let activeCount = 0;

    for (const session of this.sessions.values()) {
      const timeSinceActivity = now.getTime() - session.lastActivity.getTime();
      if (timeSinceActivity <= this.SESSION_TIMEOUT_MS) {
        activeCount++;
      }
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions: activeCount,
    };
  }
}

// Export singleton instance
export const conversationService = new ConversationService();
