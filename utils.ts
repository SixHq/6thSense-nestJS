import crypto from 'crypto';
import _ from 'lodash';
import moment from 'moment-timezone';
import { v4 as uuid4 } from 'uuid';
//import aesjs from 'aes-everywhere';
const aesjs=require("aes-everywhere");

function parseBools(encodedString: string): string {
  var decodeString = atob(encodedString);
  decodeString = decodeString.replace(/ /g, '');
  decodeString = decodeString.replace('true,', 'true,');
  decodeString = decodeString.replace(',true', 'true,');
  decodeString = decodeString.replace('false,', 'false,');
  decodeString = decodeString.replace(',false', 'false,');
  return decodeString;
}

export function get_time_now(): number {
  const tz = 'Africa/Lagos';
  const today = moment().tz(tz);
  return today.unix();
}

function get_todays_start(): number {
  const tz = 'Africa/Lagos';
  const today = moment().tz(tz).startOf('day');
  return today.unix();
}

function get_day_from_now(days: number): number {
  const tz = 'Africa/Lagos';
  const today = moment().tz(tz).startOf('day').add(days, 'days');
  return today.unix();
}

function get_min_offset_from_now(min: number): number {
  const now = get_time_now();
  const delta = min * 60;
  const targetTime = now + delta;
  const offset = targetTime - now;
  return offset;
}

function get_offset_from_nine_am(): number {
  const now = get_time_now();
  const startOfDay = get_todays_start();
  const delta = 9 * 60 * 60;
  const nineAM = startOfDay + delta;
  const offset = nineAM - now;
  return offset;
}

function get_offset_from_twleve_fiteen(): number {
  const now = get_time_now();
  const startOfDay = get_todays_start();
  const delta = 12 * 60 * 60 + 57 * 60;
  const twelveFifteen = startOfDay + delta;
  const offset = twelveFifteen - now;
  return offset;
}

function get_offset_from_six_pm(): number {
  const now = get_time_now();
  const startOfDay = get_todays_start();
  const delta = 18 * 60 * 60;
  const sixPM = startOfDay + delta;
  const offset = sixPM - now;
  return offset;
}

function get_next_nine_am_day(): number {
  const nextDate = get_day_from_now(1);
  return nextDate + 9 * 60 * 60;
}

function get_readable_date_from_time_stamp(ts: number): string {
  return moment.unix(ts).format('YYYY-MM-DD');
}

function get_day_from_time_stamp(timeStamp: number): string {
  const time = moment.unix(timeStamp);
  const day = time.format('dddd');
  return day;
}

function get_a_week_time(timestamp: number): number {
  return timestamp + 7 * 24 * 60 * 60;
}

function parseWords(word: string): any {
  const added_word = ':::bob_::_johan::sixer';
  const index = word.indexOf(added_word);
  const add = word.slice(index);
  const real = word.replace(add, '');

  if (add.includes('int')) {
    return parseInt(real);
  }

  if (add.includes('float')) {
    return parseFloat(real);
  }

  if (add.includes('str')) {
    const converted = real;
    return converted.toString();
  }

  if (add.includes('bool')) {
    return !!real;
  }
}

export function postOrderEncrypt(payload: any): string {
  const newSecretKey = uuid4().substring(0, 16);

  const secretKeyPartOne = newSecretKey.substring(0, 4);
  const secretKeyPartTwo = newSecretKey.substring(4, 8);
  const secretKeyPartThree = newSecretKey.substring(8, 12);
  const secretKeyPartFour = newSecretKey.substring(12, 16);
  var encryptedData = aesjs.encrypt(JSON.stringify(payload), newSecretKey);
  const positions = [4, 8, 12, 16];
  const keys = [secretKeyPartOne, secretKeyPartTwo, secretKeyPartThree, secretKeyPartFour];
  encryptedData =
    encryptedData.slice(0, positions[0]) +
    keys[0] +
    encryptedData.slice(positions[0], positions[1]) +
    keys[1] +
    encryptedData.slice(positions[1], positions[2]) +
    keys[2] +
    encryptedData.slice(positions[2], positions[3]) +
    keys[3] +
    encryptedData.slice(positions[3]);
  return encryptedData;
}

export function postOrderDecrypt(encryptedPayload: string): any {
  var secretKey = '';
  var newEncryptedPayload = encryptedPayload;
  secretKey =
    newEncryptedPayload.slice(4, 8) +
    newEncryptedPayload.slice(12, 16) +
    newEncryptedPayload.slice(20, 24) +
    newEncryptedPayload.slice(28, 32);
  newEncryptedPayload =
    newEncryptedPayload.slice(0, 4) +
    newEncryptedPayload.slice(8, 12) +
    newEncryptedPayload.slice(16, 20) +
    newEncryptedPayload.slice(24, 28) +
    newEncryptedPayload.slice(32);

  const decryptedPayload = aesjs.decrypt(newEncryptedPayload, secretKey);
  return JSON.parse(decryptedPayload);
}
