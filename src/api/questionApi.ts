import axiosInstance from './axiosInstance';
import { unwrapResponse } from './helpers';
import type { Question, QuestionPayload } from '../types/queryme';

const QUESTION_MUTATION_TIMEOUT_MS = 120000;

export const questionApi = {
  async getQuestions(examId: string, signal?: AbortSignal): Promise<Question[]> {
    const response = await axiosInstance.get<Question[]>(`/exams/${examId}/questions`, { signal });
    return unwrapResponse(response);
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
