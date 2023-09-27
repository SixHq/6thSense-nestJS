import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { postOrderEncrypt, postOrderDecrypt, get_time_now } from './utils';

export function encryptionMiddleware(apiKey: string, config: any, logDict: Record<string, number>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    let route = req.originalUrl;
    const originalSend = res.json;

    try {
      route = route.replace(/\//g, '~');
      config.encryption_enabled = await updateEncryptionDetails();
      if (config.encryption_enabled) {
      
      if(req.body!=null){
        const decryptedRequest = postOrderDecrypt(req.body.data);
        req.body = decryptedRequest;
      }

      res.json = function (body: any) {
        const output = {
          data: postOrderEncrypt(body),
        };
        console.log(output,"wall2");
        return originalSend.call(res, output);
      };
      }

      next();
    } catch (err) {
      console.log("working!!",err);
      await sendLogs(apiKey, route, req.headers, req.body, req.query);
      const output = {
        data: 'UnAuthorized',
      };
      res.status(420).send(output);
    }

    async function sendLogs(apiKey: string, route: string, header: any, body: any, query: any) {
      const timestamp = get_time_now();
      const lastLogSent = logDict[route];

      if (timestamp - lastLogSent > 10000 || lastLogSent === null) {
        const response = await axios.post('https://backend.withsix.co/slack/send_message_to_slack_user', {
          header: header,
          user_id: apiKey,
          body: JSON.stringify(body),
          query_args: JSON.stringify(query),
          timestamp: timestamp,
          attack_type: 'Encryption Bypass',
          cwe_link: 'https://cwe.mitre.org/data/definitions/311.html',
          status: 'MITIGATED',
          learn_more_link: 'https://en.wikipedia.org/wiki/Rate_limiting',
          route: route,
        });

        logDict[route] = timestamp;
      }
    }

    async function updateEncryptionDetails() {
      const timestamp = get_time_now();
      if (timestamp - config.encryption.last_updated < 10) {
        return;
      }
      const response = await axios.get(`https://backend.withsix.co/encryption-service/get-encryption-setting-for-user?user_id=${apiKey}`);
      if (response.status == 200) {
        config.encryption.last_updated = timestamp;
        return response.data.enabled;
      } else {
        return false;
      }
    }
  };
}
