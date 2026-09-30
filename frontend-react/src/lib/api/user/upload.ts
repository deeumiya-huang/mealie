import { BaseAPI } from "../base/base-clients";
import { apiRuntime } from "../runtime";

export class UploadFile extends BaseAPI {
  file(url: string, fileObject: FormData | Blob) {
    return apiRuntime.axios().post<string>(url, fileObject, { headers: { "Content-Type": "multipart/form-data" } });
    // return this.requests.post<string>(url, fileObject);
  }
}
