export interface Question {
  id: number;
  prompt: string;
}

export interface Exam {
  id: number;
  title: string;
  description: string;
  duration: number;
  questions: Question[];
}

export const mockExams: Exam[] = [
  {
    id: 1,
    title: "SQL Basics Exam",
    description: "Test your SQL fundamentals including SELECT, FROM, and WHERE clauses.",
    duration: 30,
    questions: [
      { id: 1, prompt: "Write a query to select all users from the users table." },
      { id: 2, prompt: "Find all products with a price greater than 100." }
    ]
  },
  {
    id: 2,
    title: "Advanced JOINS Quiz",
    description: "Master INNER, LEFT, RIGHT, and FULL outer joins with complex datasets.",
    duration: 45,
    questions: [
      { id: 3, prompt: "Join the orders and customers tables to get customer names for each order." },
      { id: 4, prompt: "List all departments and the employees working in them, including departments with no employees." }
    ]
  },
  {
    id: 3,
    title: "Aggregation & Grouping",
    description: "Practice using COUNT, SUM, AVG, and GROUP BY to summarize your data.",
    duration: 20,
    questions: [
      { id: 5, prompt: "Calculate the average salary for each department." },
      { id: 6, prompt: "Find the total quantity of items sold per product category." }
    ]
  }
];
