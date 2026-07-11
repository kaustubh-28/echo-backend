import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ModerationWorkflow } from '../src/modules/moderation/moderation.workflow';
import { ModerationEngine } from '../src/modules/moderation/moderationEngine';
import { DecisionResolver } from '../src/modules/moderation/decisionResolver';
import { NotificationDispatcher } from '../src/modules/notifications/notificationDispatcher';
import { EntriesService } from '../src/modules/entries/entries.service';
import { EntriesRepository } from '../src/modules/entries/entries.repository';
import { ReportRepository } from '../src/modules/entries/report.repository';
import { VisitorService } from '../src/shared/services/visitor.service';
import { ModerationLogModel } from '../src/modules/moderation/moderationLog.model';
import { EntryStatus } from '../src/modules/entries/entries.constants';
import { ModerationAction } from '../src/shared/types';

let mockCreatedEntryText = 'To be or not to be.';
let mockCreatedEntryEmail = 'user@example.com';

vi.mock('../src/modules/entries/entries.model', () => {
  return {
    EntryModel: {
      findByIdAndUpdate: vi.fn().mockImplementation((id, update) => {
        return Promise.resolve({
          _id: id,
          submissionId: 'SUB-123',
          text: mockCreatedEntryText,
          author: 'Hamlet',
          source: 'Shakespeare',
          category: 'quote',
          status: update.$set?.status || 'published',
          email: mockCreatedEntryEmail,
          helpfulCount: 0,
          reportCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }),
      findOne: vi.fn().mockResolvedValue(null),
    },
    default: {
      findByIdAndUpdate: vi.fn().mockImplementation((id, update) => {
        return Promise.resolve({
          _id: id,
          submissionId: 'SUB-123',
          text: mockCreatedEntryText,
          author: 'Hamlet',
          source: 'Shakespeare',
          category: 'quote',
          status: update.$set?.status || 'published',
          email: mockCreatedEntryEmail,
          helpfulCount: 0,
          reportCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }),
      findOne: vi.fn().mockResolvedValue(null),
    },
  };
});

vi.mock('../src/modules/moderation/moderationLog.model', () => {
  return {
    ModerationLogModel: {
      create: vi.fn().mockResolvedValue({}),
    },
    default: {
      create: vi.fn().mockResolvedValue({}),
    },
  };
});

describe('Moderation Workflow Integration', () => {
  let entriesRepository: EntriesRepository;
  let reportRepository: ReportRepository;
  let visitorService: VisitorService;
  let notificationDispatcher: NotificationDispatcher;
  let entriesService: EntriesService;

  beforeEach(() => {
    vi.restoreAllMocks();

    entriesRepository = {
      create: vi.fn().mockImplementation((dto) => {
        mockCreatedEntryText = dto.text;
        mockCreatedEntryEmail = dto.email;
        return Promise.resolve({
          id: '507f1f77bcf86cd799439019',
          ...dto,
          status: dto.status || EntryStatus.PUBLISHED,
          helpfulCount: 0,
          reportCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }),
      findById: vi.fn(),
      incrementReportCount: vi.fn(),
    } as any;

    reportRepository = {
      exists: vi.fn().mockResolvedValue(false),
      create: vi.fn().mockResolvedValue(true),
    } as any;

    visitorService = {
      resolve: vi.fn().mockReturnValue({ visitorHash: 'mock-visitor-hash' }),
    } as any;

    notificationDispatcher = {
      submissionReceived: vi.fn().mockResolvedValue(undefined),
      submissionApproved: vi.fn().mockResolvedValue(undefined),
      submissionRemoved: vi.fn().mockResolvedValue(undefined),
    } as any;

    entriesService = new EntriesService(
      entriesRepository,
      reportRepository,
      visitorService,
      notificationDispatcher,
    );
  });

  it('Submission executes ModerationEngine, DecisionResolver, ModerationWorkflow, creates ModerationLog, and calls NotificationDispatcher once', async () => {
    const engineEvaluateSpy = vi.spyOn(ModerationEngine.prototype, 'evaluate');
    const resolverResolveSpy = vi.spyOn(DecisionResolver.prototype, 'resolve');
    const workflowTransitionSpy = vi.spyOn(ModerationWorkflow.prototype, 'transition');
    const logCreateSpy = vi.spyOn(ModerationLogModel, 'create');

    const dto = {
      text: 'Sample submission text.',
      author: 'Author',
      source: 'Source',
      category: 'quote',
      email: 'test@example.com',
    };

    const req = {} as any;
    const entry = await entriesService.createEntry(dto, req);

    expect(engineEvaluateSpy).toHaveBeenCalledTimes(1);
    expect(resolverResolveSpy).toHaveBeenCalled();
    expect(workflowTransitionSpy).toHaveBeenCalledTimes(1);
    expect(logCreateSpy).toHaveBeenCalledTimes(1);
    expect(notificationDispatcher.submissionReceived).toHaveBeenCalledTimes(1);
    expect(notificationDispatcher.submissionReceived).toHaveBeenCalledWith(
      'test@example.com',
      entry.submissionId,
      'Sample submission text.',
    );
  });

  it('Report threshold executes reportThreshold() on ModerationWorkflow', async () => {
    const workflowThresholdSpy = vi.spyOn(ModerationWorkflow.prototype, 'reportThreshold').mockResolvedValue({} as any);

    const entry = {
      id: '507f1f77bcf86cd799439019',
      status: EntryStatus.PUBLISHED,
      reportCount: 4,
    } as any;

    vi.mocked(entriesRepository.findById).mockResolvedValueOnce(entry);
    vi.mocked(entriesRepository.incrementReportCount).mockResolvedValueOnce({
      ...entry,
      reportCount: 5,
    });

    await entriesService.reportEntry('507f1f77bcf86cd799439019', 'spam' as any, {} as any);

    expect(workflowThresholdSpy).toHaveBeenCalledTimes(1);
    expect(workflowThresholdSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: '507f1f77bcf86cd799439019', reportCount: 5 }),
      'Report threshold reached',
    );
  });

  it('Approval executes transition() on ModerationWorkflow and invokes NotificationDispatcher once', async () => {
    const transitionSpy = vi.spyOn(ModerationWorkflow.prototype, 'transition').mockResolvedValue({
      id: '507f1f77bcf86cd799439019',
      submissionId: 'SUB-123',
      text: 'Approved text',
      email: 'user@example.com',
      status: EntryStatus.PUBLISHED,
    } as any);

    const workflow = new ModerationWorkflow();
    const mockNotificationDispatcher = {
      submissionApproved: vi.fn().mockResolvedValue(undefined),
    } as any;
    (workflow as any).notificationDispatcher = mockNotificationDispatcher;

    const entry = { id: '507f1f77bcf86cd799439019', status: EntryStatus.SHADOW_HIDDEN } as any;
    await workflow.approve(entry, 'admin-123', 'Approve reason');

    expect(transitionSpy).toHaveBeenCalledTimes(1);
    expect(transitionSpy).toHaveBeenCalledWith(
      entry,
      EntryStatus.PUBLISHED,
      ModerationAction.ADMIN_APPROVED,
      'Approve reason',
      'admin-123',
    );
    expect(mockNotificationDispatcher.submissionApproved).toHaveBeenCalledTimes(1);
  });

  it('Removal executes transition() on ModerationWorkflow and invokes NotificationDispatcher once', async () => {
    const transitionSpy = vi.spyOn(ModerationWorkflow.prototype, 'transition').mockResolvedValue({
      id: '507f1f77bcf86cd799439019',
      submissionId: 'SUB-123',
      text: 'Removed text',
      email: 'user@example.com',
      status: EntryStatus.REMOVED,
    } as any);

    const workflow = new ModerationWorkflow();
    const mockNotificationDispatcher = {
      submissionRemoved: vi.fn().mockResolvedValue(undefined),
    } as any;
    (workflow as any).notificationDispatcher = mockNotificationDispatcher;

    const entry = { id: '507f1f77bcf86cd799439019', status: EntryStatus.PUBLISHED } as any;
    await workflow.remove(entry, 'admin-123', 'Remove reason');

    expect(transitionSpy).toHaveBeenCalledTimes(1);
    expect(transitionSpy).toHaveBeenCalledWith(
      entry,
      EntryStatus.REMOVED,
      ModerationAction.ADMIN_REMOVED,
      'Remove reason',
      'admin-123',
    );
    expect(mockNotificationDispatcher.submissionRemoved).toHaveBeenCalledTimes(1);
  });
});
