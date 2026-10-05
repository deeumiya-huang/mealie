import { BaseAPI } from "../base/base-clients";
import { http } from "@/lib/http";

export class UploadFile extends BaseAPI {
  file(url: string, fileObject: FormData) {
    return http.post<string>(url, fileObject, { headers: { "Content-Type": "multipart/form-data" } });
    // return this.requests.post<string>(url, fileObject);
  }
}
