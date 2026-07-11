import { EntryModel } from '../entries/entries.model';
import { ModerationLogModel } from './moderationLog.model';
import { ModerationAction } from '@shared/types';
import { EntryStatus } from '../entries/entries.constants';
import { NotificationDispatcher } from '../notifications/notificationDispatcher';
import { ModerationEngine } from './moderationEngine';
import { Types } from 'mongoose';
import { Entry } from '../entries/entries.types';

export class ModerationWorkflow {
  private readonly moderationEngine: ModerationEngine;
  private readonly notificationDispatcher: NotificationDispatcher;

  constructor() {
    this.moderationEngine = new ModerationEngine();
    this.notificationDispatcher = new NotificationDispatcher();
  }

  async submit(entry: Entry): Promise<Entry> {
    // 1. Evaluate the entry
    const decision = await this.moderationEngine.evaluate(entry);
    
    // Determine the action based on decision
    let action = ModerationAction.AUTO_APPROVED;
    if (decision.status === EntryStatus.REMOVED) {
      action = ModerationAction.AUTO_REJECTED;
    } else if (decision.status === EntryStatus.SHADOW_HIDDEN) {
      action = ModerationAction.AUTO_HIDDEN;
    }

    // 2. Perform the initial transition
    const updatedEntry = await this.transition(
      entry,
      decision.status,
      action,
      decision.reason || 'Automated evaluation complete',
      null,
      { confidence: decision.confidence, triggeredRules: decision.triggeredRules }
    );

    // 3. Dispatch the submission notification
    if (updatedEntry.email) {
      await this.notificationDispatcher.submissionReceived(
        updatedEntry.email,
        updatedEntry.submissionId,
        updatedEntry.text
      );
    }

    return updatedEntry;
  }

  async approve(entry: Entry, performedBy: string, reason?: string): Promise<Entry> {
    const updatedEntry = await this.transition(
      entry,
      EntryStatus.PUBLISHED,
      ModerationAction.ADMIN_APPROVED,
      reason || 'Approved by administrator',
      performedBy
    );

    if (updatedEntry.email) {
      await this.notificationDispatcher.submissionApproved(
        updatedEntry.email,
        updatedEntry.submissionId
      );
    }

    return updatedEntry;
  }

  async remove(entry: Entry, performedBy: string, reason?: string): Promise<Entry> {
    const updatedEntry = await this.transition(
      entry,
      EntryStatus.REMOVED,
      ModerationAction.ADMIN_REMOVED,
      reason || 'Removed by administrator',
      performedBy
    );

    if (updatedEntry.email) {
      await this.notificationDispatcher.submissionRemoved(
        updatedEntry.email,
        updatedEntry.submissionId,
        reason
      );
    }

    return updatedEntry;
  }

  async reportThreshold(entry: Entry, reason?: string): Promise<Entry> {
    return this.transition(
      entry,
      EntryStatus.SHADOW_HIDDEN,
      ModerationAction.REPORT_THRESHOLD,
      reason || 'Report threshold reached',
      null
    );
  }

  async transition(
    entry: Entry,
    newStatus: EntryStatus,
    action: ModerationAction,
    reason: string | null,
    performedBy: string | null,
    metadata: Record<string, any> = {}
  ): Promise<Entry> {
    const oldStatus = entry.status || null;

    // 1. Update Entry in Database
    const updatedDoc = await EntryModel.findByIdAndUpdate(
      entry.id,
      {
        $set: {
          status: newStatus,
          moderationReason: reason || undefined,
          moderatedBy: performedBy ? new Types.ObjectId(performedBy) : undefined,
          moderatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedDoc) {
      throw new Error(`Entry with id ${entry.id} not found`);
    }

    const updatedEntry: Entry = {
      id: updatedDoc._id.toString(),
      submissionId: updatedDoc.submissionId,
      text: updatedDoc.text,
      author: updatedDoc.author,
      source: updatedDoc.source,
      category: updatedDoc.category,
      email: updatedDoc.email,
      visitorHash: updatedDoc.visitorHash,
      status: updatedDoc.status,
      moderationReason: updatedDoc.moderationReason,
      moderatedBy: updatedDoc.moderatedBy ? updatedDoc.moderatedBy.toString() : undefined,
      moderatedAt: updatedDoc.moderatedAt,
      helpfulCount: updatedDoc.helpfulCount,
      reportCount: updatedDoc.reportCount,
      createdAt: updatedDoc.createdAt,
      updatedAt: updatedDoc.updatedAt,
    };

    // 2. Create ModerationLog
    await ModerationLogModel.create({
      entryId: new Types.ObjectId(entry.id),
      action,
      oldStatus,
      newStatus,
      reason,
      performedBy: performedBy ? new Types.ObjectId(performedBy) : null,
      metadata,
    });

    return updatedEntry;
  }
}
export default ModerationWorkflow;
