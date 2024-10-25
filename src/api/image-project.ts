import axios from '@/axios/default-axios.ts';
import {ChapterInfo} from "@/api/text-chapter.ts";

export interface ImageProject {
  id: number;
  projectId: string;
  projectName: string;
  projectType: string;
  chapterCount: number;
}

export function createProject(params: FormData) {
  return axios.post('/api/imageProject/createProject', params);
}

export function createFormatImageProject(params: {
  projectName: string;
  projectType: string;
  chapterInfos: ChapterInfo[]
}) {
  return axios.post('/api/imageProject/createFormatImageProject', params);
}

export function projectList() {
  return axios.post<ImageProject[]>('/api/imageProject/projectList');
}

export function getImageProject(params: { projectId: string }) {
  return axios.post<ImageProject>('/api/imageProject/getImageProject', params);
}

export function tmpChapterSplit(params: { projectId: string, chapterPattern: string, dialoguePattern: string }) {
  return axios.post<string[]>('/api/imageProject/tmpChapterSplit', params);
}

export function chapterSplit(params: { projectId: string, chapterPattern: string, dialoguePattern: string }) {
  return axios.post('/api/imageProject/chapterSplit', params);
}

export function deleteProject(params: ImageProject) {
  return axios.post('/api/imageProject/deleteProject', params);
}
