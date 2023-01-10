import { taskQueue } from '../queue'
import { TaskModel } from '../persistence'
import { DownloadType } from '../../share/models'
import { Downloader, DownloaderEvent } from './downloader'
import { RangeDownloader } from './range_downloader'
import { DirectDownloader } from './direct_downloader'

const getDownloader = (taskNo: number): Downloader => {
    const task: TaskModel = taskQueue.getTaskItem(taskNo) as TaskModel
    if (task.downloadType === DownloadType.Range) {
        return new RangeDownloader(taskNo)
    } else {
        return new DirectDownloader(taskNo)
    }
}

export { getDownloader, Downloader, DirectDownloader, RangeDownloader, DownloaderEvent }