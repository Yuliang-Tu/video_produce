'use client'
import { useTranslations } from 'next-intl'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import { AppIcon } from '@/components/ui/icons'

interface VideoToolbarProps {
  totalPanels: number
  runningCount: number
  videosWithUrl: number
  failedCount: number
  selectedCount: number
  selectableCount: number
  canUseFirstLastFrame: boolean
  isAnyTaskRunning: boolean
  isBatchOperating: boolean
  isDownloading: boolean
  onGenerateAll: () => void
  onGenerateSelected: () => void
  onSelectAll: () => void
  onSelectPending: () => void
  onClearSelection: () => void
  onEnableFirstLastFrame: () => void
  onDownloadAll: () => void
  onBack: () => void
  onEnterEditor?: () => void  // 进入剪辑器
  videosReady?: boolean  // 是否有视频可以剪辑
}

export default function VideoToolbar({
  totalPanels,
  runningCount,
  videosWithUrl,
  failedCount,
  selectedCount,
  selectableCount,
  canUseFirstLastFrame,
  isAnyTaskRunning,
  isBatchOperating,
  isDownloading,
  onGenerateAll,
  onGenerateSelected,
  onSelectAll,
  onSelectPending,
  onClearSelection,
  onEnableFirstLastFrame,
  onDownloadAll,
  onBack,
  onEnterEditor,
  videosReady = false
}: VideoToolbarProps) {
  const t = useTranslations('video')
  const videoTaskRunningState = isAnyTaskRunning
    ? resolveTaskPresentationState({
      phase: 'processing',
      intent: 'generate',
      resource: 'video',
      hasOutput: videosWithUrl > 0,
    })
    : null
  const videoDownloadState = isDownloading
    ? resolveTaskPresentationState({
      phase: 'processing',
      intent: 'generate',
      resource: 'video',
      hasOutput: videosWithUrl > 0,
    })
    : null
  return (
    <div className="glass-surface p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-[var(--glass-text-secondary)]">
             {t('toolbar.title')}
          </span>
          <span className="text-sm text-[var(--glass-text-tertiary)]">
            {t('toolbar.totalShots', { count: totalPanels })}
            {runningCount > 0 && (
              <span className="text-[var(--glass-tone-info-fg)] ml-2 animate-pulse">({t('toolbar.generatingShots', { count: runningCount })})</span>
            )}
            {videosWithUrl > 0 && (
              <span className="text-[var(--glass-tone-success-fg)] ml-2">({t('toolbar.completedShots', { count: videosWithUrl })})</span>
            )}
            {failedCount > 0 && (
              <span className="text-[var(--glass-tone-danger-fg)] ml-2">({t('toolbar.failedShots', { count: failedCount })})</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={onGenerateAll}
            disabled={isAnyTaskRunning}
            className="glass-btn-base glass-btn-primary flex items-center gap-2 px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnyTaskRunning ? (
              <TaskStatusInline state={videoTaskRunningState} className="text-white [&>span]:text-white [&_svg]:text-white" />
            ) : (
              <>
                <AppIcon name="plus" className="w-4 h-4" />
                <span>{t('toolbar.generateAll')}</span>
              </>
            )}
          </button>
          <button
            onClick={onDownloadAll}
            disabled={videosWithUrl === 0 || isDownloading}
            className="glass-btn-base glass-btn-tone-info flex items-center gap-2 px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            title={videosWithUrl === 0 ? t('toolbar.noVideos') : t('toolbar.downloadCount', { count: videosWithUrl })}
          >
            {isDownloading ? (
              <TaskStatusInline state={videoDownloadState} className="text-white [&>span]:text-white [&_svg]:text-white" />
            ) : (
              <>
                <AppIcon name="image" className="w-4 h-4" />
                <span>{t('toolbar.downloadAll')}</span>
              </>
            )}
          </button>
          {onEnterEditor && (
            <button
              onClick={onEnterEditor}
              disabled={!videosReady}
              className="glass-btn-base glass-btn-secondary flex items-center gap-2 px-4 py-2 text-sm font-medium border border-[var(--glass-stroke-base)] disabled:opacity-50 disabled:cursor-not-allowed"
              title={videosReady ? t('toolbar.enterEditor') : t('panelCard.needVideo')}
            >
              <AppIcon name="wandOff" className="w-4 h-4" />
              <span>{t('toolbar.enterEdit')}</span>
            </button>
          )}
          <button
            onClick={onBack}
            className="glass-btn-base glass-btn-secondary flex items-center gap-2 px-4 py-2 text-sm font-medium border border-[var(--glass-stroke-base)] hover:text-[var(--glass-tone-info-fg)]"
          >
            <AppIcon name="chevronLeft" className="w-4 h-4" />
            <span>{t('toolbar.back')}</span>
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[var(--glass-stroke-base)] pt-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-[var(--glass-text-secondary)]">
            {t('toolbar.selectedShots', { selected: selectedCount, total: selectableCount })}
          </span>
          <button
            type="button"
            onClick={onSelectAll}
            disabled={isAnyTaskRunning || selectableCount === 0}
            className="glass-btn-base glass-btn-secondary px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('toolbar.selectAll')}
          </button>
          <button
            type="button"
            onClick={onSelectPending}
            disabled={isAnyTaskRunning || selectableCount === 0}
            className="glass-btn-base glass-btn-secondary px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('toolbar.selectPending')}
          </button>
          <button
            type="button"
            onClick={onClearSelection}
            disabled={isAnyTaskRunning || selectedCount === 0}
            className="glass-btn-base glass-btn-secondary px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('toolbar.clearSelection')}
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={onEnableFirstLastFrame}
            disabled={isAnyTaskRunning || isBatchOperating || !canUseFirstLastFrame || selectedCount === 0}
            className="glass-btn-base glass-btn-tone-info flex items-center gap-2 px-3 py-1.5 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <AppIcon name="link" className="w-3.5 h-3.5" />
            <span>{isBatchOperating ? t('toolbar.submittingBatch') : t('toolbar.enableFirstLastFrame')}</span>
          </button>
          <button
            type="button"
            onClick={onGenerateSelected}
            disabled={isAnyTaskRunning || isBatchOperating || selectedCount === 0}
            className="glass-btn-base glass-btn-primary flex items-center gap-2 px-3 py-1.5 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <AppIcon name="video" className="w-3.5 h-3.5" />
            <span>{isBatchOperating ? t('toolbar.submittingBatch') : t('toolbar.generateSelected')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
