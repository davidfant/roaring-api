import * as request from 'request-promise';
import {definitions as PersonDefinitions} from './definitions/person';

export { PersonDefinitions };

const API_URL = 'https://api.roaring.io';

interface RoaringOAuthOptions {
  clientId: string;
  clientSecret: string;
}

interface RoaringAccessOptions {
  token: string;
  expiresAt: Date;
}

export class RoaringClient {

  oauthOptions: RoaringOAuthOptions;
  accessOptions: RoaringAccessOptions;

  constructor(oauthOptions: RoaringOAuthOptions, accessOptions: RoaringAccessOptions) {
    this.oauthOptions = oauthOptions;
    this.accessOptions = accessOptions;
  }

  static async load(oauth: RoaringOAuthOptions): Promise<RoaringClient> {
    const access = await this.generateAccess(oauth);
    return new RoaringClient(oauth, access);
  }

  private static async generateAccess(oauth: RoaringOAuthOptions): Promise<RoaringAccessOptions> {
    const response = await request.post({
      url: `${API_URL}/token`,
      form: {grant_type: 'client_credentials'},
      auth: {
        bearer: Buffer
          .from(`${oauth.clientId}:${oauth.clientSecret}`, 'binary')
          .toString('base64'),
      },
      json: true,
    });

    return {
      token: response.access_token,
      expiresAt: new Date(Date.now() + response.expires_in * 1000),
    };
  }

  private isAccessTokenExpired(): boolean {
    return this.accessOptions.expiresAt < new Date();
  }

  private async refreshAccessToken(): Promise<void> {
    this.accessOptions = await RoaringClient.generateAccess(this.oauthOptions);
  }

  async person(personalNumber: string): Promise<PersonDefinitions['PersonLookupResponse']> {
    if (this.isAccessTokenExpired()) await this.refreshAccessToken();
    return request.get({
      url: `${API_URL}/person/1.0/person`,
      qs: {personalNumber},
      auth: {bearer: this.accessOptions.token},
      json: true
    });
  }

}
