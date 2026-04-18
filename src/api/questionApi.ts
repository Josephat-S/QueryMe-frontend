import axiosInstance from './axiosInstance';
import { toBackendPaginationParams, unwrapListResponse, unwrapResponse, type PaginationParams } from './helpers';
import type { Question, QuestionPayload } from '../types/queryme';

const QUESTION_MUTATION_TIMEOUT_MS = 120000;

export const questionApi = {
  async getQuestions(examId: string, paramsOrSignal?: PaginationParams | AbortSignal): Promise<Question[]> {
    const signal = paramsOrSignal instanceof AbortSignal ? paramsOrSignal : paramsOrSignal?.signal;
    const params = paramsOrSignal instanceof AbortSignal
      ? ({ page: 1, size: 500 } as const)
      : (paramsOrSignal ?? { page: 1, size: 500 });

    const response = await axiosInstance.get(`/exams/${examId}/questions`, {
      params: toBackendPaginationParams(params),
      signal,
    });
    return unwrapListResponse<Question>(response);
  },

  async createQuestion(examId: string, payload: QuestionPayload, signal?: AbortSignal): Promise<Question> {
    const response = await axiosInstance.post<Question>(`/exams/${examId}/questions`, payload, {
      signal,
      timeout: QUESTION_MUTATION_TIMEOUT_MS,
    });
    return unwrapResponse(response);
  },

  async updateQuestion(examId: string, questionId: string, payload: QuestionPayload, signal?: AbortSignal): Promise<Question> {
    const response = await axiosInstance.put<Question>(`/exams/${examId}/questions/${questionId}`, payload, {
      signal,
      timeout: QUESTION_MUTATION_TIMEOUT_MS,
    });
    return unwrapResponse(response);
  },
};
