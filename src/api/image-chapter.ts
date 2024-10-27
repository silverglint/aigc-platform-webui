import axios from '@/axios/default-axios.ts';
import {FetchStream, IFetchStreamOptions} from "@/api/stream.ts";
import {Pagination, PaginationResp} from "@/types/global.ts";
import customAxios from "@/axios/custom-axios.ts";

export interface ImageContentConfig {
  edit: boolean;
  showDialogue: boolean;
}

export interface ImageDrama {
  id: number;
  projectId: string;
  projectName: string;
  chapterId: string;
  chapterName: string;
  content: string;
  dialoguePattern: string;
  sortOrder: number;
  wordNum: number;
  textNum: number;
  dialogueNum: number;
  roleNum: number;
  imageTaskState: number;
}

export interface TextChapterPage extends Pagination {
  projectId: string;
}

export function pageChapters(params: TextChapterPage) {
  return axios.post<PaginationResp<ImageDrama>>('/api/imageDrama/pageChapters', params);
}

export function chapters4Sort(params: { projectId: string }) {
  return axios.post<ImageDrama[]>('/api/imageDrama/chapters4Sort', params);
}

export function deleteChapter(params: ImageDrama) {
  return axios.post('/api/imageDrama/deleteChapter', params);
}

export function getTextChapter(params: ChapterParam) {
  return axios.post<ImageDrama>('/api/imageDrama/getTextChapter', params);
}

export interface ImageRole {
  id: number;
  projectId: string;
  chapterId?: string;
  roleCount: number;
  coverCommonRole: boolean;
  role: string;
  imagePrompt: string;
  isCommonRole?: boolean;
}

export interface PolyphonicInfo {
  index: number,
  markup: string
}

export interface TextMarkupInfo {
  polyphonicInfos: PolyphonicInfo[]
}

export interface DramaInfoInference{
  id: number;
  projectId: string;
  chapterId: string;
  dramaInfoId:number;
  textId: string;
  text: string;
  timeStart:string;
  timeEnd:string;
}

export interface DramaInfo {
  id: number;
  index: string;
  projectId: string;
  chapterId: string;
  paraIndex: number;
  sentIndex: number;
  textId: string;
  text: string[];
  textSort: number;
  role: string;
  imagePrompt: string;
  imageTaskState: number;
  inferences: DramaInfoInference[];
}

export function tmpDialogueParse(params: ImageDrama) {
  return axios.post<DramaInfo[]>('/api/imageDrama/tmpDialogueParse', params);
}

export function chapterEdit(params: ImageDrama) {
  return axios.post('/api/imageDrama/chapterEdit', params);
}

export function chapterAdd(params: FormData) {
  return axios.post('/api/imageDrama/chapterAdd', params);
}

export function chapterSort(params: ImageDrama[]) {
  return axios.post('/api/imageDrama/chapterSort', params);
}

export function chapterInfos(params: { projectId: string, chapterId: string }) {
  return axios.post<DramaInfo[]>('/api/imageDrama/chapterInfos', params);
}

export function roles(params: { projectId: string, chapterId: string }) {
  return axios.post<ImageRole[]>('/api/imageDrama/roles', params);
}

export function updateRole(params: ImageRole) {
  return axios.post('/api/imageDrama/updateRole', params);
}

export function updateRoleModel(params: ImageRole) {
  return axios.post('/api/imageDrama/updateRoleModel', params);
}

export function roleCombine(params: {
  projectId: string,
  chapterId: string,
  fromRoleName: string;
  toRoleName: string;
}) {
  return axios.post('/api/imageDrama/roleCombine', params);
}

export function textRoleChange(params: {
  projectId: string,
  chapterId: string,
  chapterInfoIds: number[];
  formRoleName: string;
  fromRoleType: string;
  changeModel: boolean;
}) {
  return axios.post('/api/imageDrama/textRoleChange', params);
}

export function saveToCommonRole(params: ImageRole) {
  return axios.post('/api/imageDrama/saveToCommonRole', params);
}

export function commonRoles(params: { projectId: string }) {
  return axios.post<ImageRole[]>('/api/imageDrama/commonRoles', params);
}

export function createCommonRole(params: ImageRole) {
  return axios.post('/api/imageDrama/createCommonRole', params);
}

export function updateCommonRole(params: ImageRole) {
  return axios.post('/api/imageDrama/updateCommonRole', params);
}

export function deleteCommonRole(params: ImageRole) {
  return axios.post('/api/imageDrama/deleteCommonRole', params);
}

export function deleteRole(params: ImageRole) {
  return axios.post('/api/imageDrama/deleteRole', params);
}

export function roleInference(url: string,
                              params: Object,
                              onMessage: (data: string[], index: number) => void,
                              onDone?: () => void,
                              onError?: (response: Response) => void,
                              onTimeout?: () => void) {
  const fetchOptions: IFetchStreamOptions = {
    url,
    requestInit: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    },
    onMessage: onMessage,
    onDone: onDone,
    onError: onError,
    onTimeout: onTimeout,
  };
  const fetchStream = new FetchStream(fetchOptions);

  fetchStream.startRequest();
}

export interface TextRoleInference {
  textIndex: string;
  role: string;
  gender: string;
  age: string;
  mood: string;
}

export interface RoleInferenceData {
  content: string;
  lines: string;
  textRoleInferences: TextRoleInference[];
}

export function queryRoleInferenceCache(params: { projectId: string, chapterId: string }) {
  return axios.post<RoleInferenceData>('/api/imageDrama/queryRoleInferenceCache', params);
}

export interface ChapterParam {
  projectId?: string;
  chapterId?: string;
}

export function updateControls(params: {
  projectId: string,
  chapterId: string,
  chapterInfoIds: number[],
  enableVolume: boolean,
  volume: number,
  enableSpeed: boolean,
  speed: number,
  enableInterval: boolean,
  interval: number,
}) {
  return axios.post('/api/imageDrama/updateControls', params);
}

export function updateChapterText(params: DramaInfo) {
  return axios.post('/api/imageDrama/updateChapterText', params);
}

export function createAudio(params: DramaInfo) {
  return axios.post<string[]>('/api/imageDrama/createAudio', params);
}

export function startCreateImage(params: {
  projectId: string,
  chapterId: string,
  actionType: string,
  chapterInfoIds: number[],
}) {
  return axios.post<string[]>('/api/imageDrama/startCreateImage', params);
}

export function stopCreateAudio() {
  return axios.post('/api/imageDrama/stopCreateAudio');
}

export function chapterExpose(params: {
  projectId: string,
  chapterId: string,
  chapterInfoIds: number[],
  combineAudio: boolean;
  subtitle: boolean;
}) {
  return axios.post<DramaInfo>('/api/imageDrama/chapterExpose', params);
}

export function deleteChapterInfo(params: DramaInfo) {
  return axios.post('/api/imageDrama/deleteChapterInfo', params);
}

export function addChapterInfo(params: DramaInfo) {
  return axios.post('/api/imageDrama/addChapterInfo', params);
}

export function updateDramaInfo(params: DramaInfo) {
  return axios.post('/api/imageDrama/updateDramaInfo', params);
}

export function saveDramaInfoInference(params: DramaInfoInference) {
  return axios.post('/api/imageDrama/saveDramaInfoInference', params);
}

export function deleteDramaInfoInference(params: DramaInfoInference) {
  return axios.post('/api/imageDrama/deleteDramaInfoInference', params);
}
export function chapterInfoSort(params: DramaInfo[]) {
  return axios.post('/api/imageDrama/chapterInfoSort', params);
}

export function playAudio(params: DramaInfo) {
  return customAxios.post('/api/imageDrama/playAudio', params, {responseType: 'blob'});
}

export function chapterCondition(params: ChapterParam) {
  return axios.post<DramaInfo[]>('/api/imageDrama/chapterCondition', params);
}

export function getChapterAudio(params: ChapterParam) {
  return customAxios.post('/api/imageDrama/getChapterAudio', params, {responseType: 'blob'});
}

export interface Subtitle {
  startTime: number;
  endTime: number;
  text: string;
}

export function getChapterSubtitle(params: ChapterParam) {
  return axios.post<Subtitle[]>('/api/imageDrama/getChapterSubtitle', params);
}

export interface ChapterBatchOperator extends ChapterParam {
  chapterInfoIds: number[];
  operatorType: 'dialogue_markup' | 'delete';
  booleanValue?: boolean;
}

export function batchOperator(params: ChapterBatchOperator) {
  return axios.post('/api/imageDrama/batchOperator', params);
}
