import * as fs from 'node:fs';
import * as http from 'node:http';
import * as stream from 'node:stream';
import * as https from 'node:https';
import { handlePromise } from '../../share/utils';
import { Log } from '../../share/utils';
import { Downloader } from "./downloader";
import { httpRequest, getDecodingStream } from '../../share/http/functions/request';
// import { generateRequestOption, getDownloadHeaders } from '../../share/http/options'
import { Header, StreamEvent } from '../../share/http/constants';
import { TaskModel } from '../persistence/model_types';

class DirectDownloader extends Downloader {
    declare taskNo: number;
    declare task: TaskModel;
    declare fd: number;
    declare filePath: string;

    constructor(taskNo: number) {
        super(taskNo);
    }

    async download(): Promise<void> {
        await super.download();
        this.downloadDirect();
    }

    // Main downlaod procedure.
    downloadDirect = async () => {
        const handleEnd = (): void => this.done();
        const handleError = (error: Error): void => {
            Log.error(error);
            this.fail();
        };
        const handleResponseStream = (stream: stream.Readable): void => {
            stream.on(StreamEvent.Data, (chunk: any) => {
                const written: number = fs.writeSync(this.fd, chunk, 0, chunk.length, this.task.progress);
                if (written !== chunk.length) {
                    stream.emit(StreamEvent.Error, new Error(`Written bytes' number and chunk's length is not equal in task ${this.task.name}'s downloading procedure.`));
                }
                this.task.progress += written;
            });
            stream.on(StreamEvent.Error, (error: Error) => handleError(error));
            stream.on(StreamEvent.End, () => handleEnd());
        };

        const requestOptions: http.RequestOptions = await this.generateDownloadOption();
        const [error, [request, response]] = await handlePromise<[http.ClientRequest, http.IncomingMessage]>(httpRequest(requestOptions));
        if (error) {
            handleError(error);
            return;
        }
        const encoding: string = response.headers[Header.ContentEncoding] as string;
        if (encoding) {
            try {
                const unzip: stream.Transform = getDecodingStream(encoding);
                response.pipe(unzip);
                handleResponseStream(unzip);
            } catch (error: any) {
                handleResponseStream(response);
            }
        } else {
            handleResponseStream(response);
        }
        request.on(StreamEvent.Error, (error: Error) => handleError(error));
    };

    // Inherit from Downloader.
    declare clear: () => void;
    declare generateDownloadOption: () => Promise<http.RequestOptions>;
    declare done: () => void;
    declare fail: () => void;
}

export { DirectDownloader };