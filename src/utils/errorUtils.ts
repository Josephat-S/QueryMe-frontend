import axios from 'axios';

export const extractErrorMessage = (
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | string | undefined;

    if (typeof data === 'string' && data.trim()) {
      return data;
    }

    if (data && typeof data === 'object') {
      const nestedData = data.data;

      if (typeof data.Message === 'string' && data.Message.trim()) {
        return data.Message;
      }

      if (typeof data.message === 'string' && data.message.trim()) {
        return data.message;
      }

      if (typeof data.error === 'string' && data.error.trim()) {
        return data.error;
      }

      if (nestedData && typeof nestedData === 'object') {
        if ('Message' in nestedData && typeof nestedData.Message === 'string' && nestedData.Message.trim()) {
          return nestedData.Message;
        }

        if ('message' in nestedData && typeof nestedData.message === 'string' && nestedData.message.trim()) {
          return nestedData.message;
        }

        if ('error' in nestedData && typeof nestedData.error === 'string' && nestedData.error.trim()) {
          return nestedData.error;
        }
      }
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};
