import { BaseAPI } from "../base/base-clients";
import type { CreateUserRegistration } from "~/lib/api/types/user";

const prefix = "/api";

const routes = {
  register: `${prefix}/users/register`,
};

export class RegisterAPI extends BaseAPI {
  async register(payload: CreateUserRegistration) {
    return await this.requests.post<unknown>(routes.register, payload);
  }
}
