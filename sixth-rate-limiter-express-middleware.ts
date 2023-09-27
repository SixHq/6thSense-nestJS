import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { get_time_now } from './utils'; // Update the import path

export function rateLimitMiddleware(apiKey: string, app: any, config: any, logDict: Record<string, any> = {}) {
  const getDate = () => {
    let _now = Date;
    return {
      seconds: _now.now(),
    };
  };

  const isRateLimitReached = async (_config: any, uid: string, route: string): Promise<boolean> => {
    var date = getDate().seconds;
    var timestamp = getDate().seconds;

    const rate_limit = _config.rate_limiter[route].rate_limit;
    const interval = _config.rate_limiter[route].interval;

    const body = {
      route: route,
      interval: interval,
      rate_limit: rate_limit,
      unique_id: uid.replace('.', '~'),
      user_id: _config.user_id,
      is_active: true,
    };

    const response = await axios.post(
      'https://backend.withsix.co/rate-limit/enquire-has-reached-rate_limit',
      body,
    );

    if (response.status == 200) {
      const bod = response.data;
      return bod['response'] == true ? true : false;
    } else {
      return false;
    }
  };

  const sendLogs = async (
    apiKey: string,
    route: string,
    header: any,
    body: any,
    query: any,
  ): Promise<void> => {
    const timestamp = get_time_now();
    const lastLogSent = logDict[route];
    if (timestamp - lastLogSent > 10000 || lastLogSent == null) {
      const response = await axios.post('https://backend.withsix.co/slack/send_message_to_slack_user', {
        header: header,
        user_id: apiKey,
        body: JSON.stringify(body),
        query_args: JSON.stringify(query),
        timestamp: timestamp,
        attack_type: 'No Rate Limit Attack',
        cwe_link: 'https://cwe.mitre.org/data/definitions/770.html',
        status: 'MITIGATED',
        learn_more_link: 'https://en.wikipedia.org/wiki/Rate_limiting',
        route: route,
      });

      logDict[route] = timestamp;
    }
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    // Middleware logic
    const host = req.headers.host;
    let status_code = 200;
    let route = req.originalUrl.replace(/\//g, '~');
    let body = null;

    // Fail-safe in case the sixth server is down
    try {
      const updatedTime = get_time_now();
      if (updatedTime - config.rate_limiter[route].last_updated > 60000) {
        const response = await axios.get(
          `https://backend.withsix.co/project-config/config/get-route-rate-limit/${apiKey}/${route}`,
        );

        if (response.statusText == 'OK') {
          status_code = response.status;
          config.rate_limiter[route].last_updated = updatedTime;

          if (status_code == 200) {
            try {
              if (response.data.is_active) {
                config.rate_limiter[route] = response.data;
                let preferred_id = config.rate_limiter[route].unique_id;

                if (preferred_id == '' || preferred_id == 'host') {
                  preferred_id = host;
                } else {
                  if (response.data.rate_limit_type == 'body') {
                    try {
                      preferred_id = req.body[preferred_id];
                    } catch (err) {
                      next();
                    }
                  } else if (response.data.rate_limit_type == 'header') {
                    preferred_id = req.headers[preferred_id];
                  } else if (response.data.rate_limit_type == 'args') {
                    preferred_id = req.query[preferred_id];
                  } else {
                    preferred_id = host;
                  }
                }

                const result = await isRateLimitReached(config, preferred_id, route);

                if (result) {
                  await sendLogs(apiKey, route, req.headers, req.body, req.query);

                  const temp_payload:any = Object.values(response.data.error_payload);
                  const final = {};
                  for (const value of temp_payload) {
                    for (const key of Object.keys(value)) {
                      if (key != 'uid') {
                        final[key] = value[key];
                      }
                    }
                  }

                  const stringed:string = JSON.stringify(final);
                  const newHeader = { 'content_length': Buffer.from(stringed.length.toString()), 'content-type': 'application/json' };
                  res.set(newHeader);
                  res.status(420).send(final);
                } else {
                  next();
                }
              } else {
                next();
              }
            } catch (err) {
              next();
            }
          }
        } else {
          next();
        }
      } else {
        next();
      }
    } catch (err) {
      console.log(err);
      next();
    }
  };
}
