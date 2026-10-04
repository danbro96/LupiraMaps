import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { logDebug } from '@danbro96/lupira-expo-diagnostics/log';
import { runLocationUpload } from './locationUploader';

/** Best-effort while-backgrounded upload: WorkManager's 15-minute floor, further throttled by Doze and
 *  app-standby buckets — in practice hours, not minutes. Recorded fixes shouldn't sit in the queue until
 *  the app is next opened; the location foreground service keeps writing them either way. */
const TASK_NAME = 'lupira-maps-upload';

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    await runLocationUpload();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (e) {
    logDebug('location', `background upload failed: ${String(e)}`);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundUpload(): Promise<void> {
  try {
    await BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: 15 });
    logDebug('location', 'background upload registered');
  } catch (e) {
    // Unavailable in Expo Go / misconfigured devices — the recorder still drains after each batch.
    logDebug('location', `background upload unavailable: ${String(e)}`);
  }
}
