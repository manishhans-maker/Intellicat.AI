export interface ProjectFile {
  path: string;
  content: string;
  language?: string;
  isModified?: boolean;
  isBinary?: boolean;
}

export type ProjectFramework = 'react' | 'html' | 'vanilla' | 'node';

export interface CodingProject {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  framework: ProjectFramework;
  files: Record<string, ProjectFile>;
  activeFilePath: string;
  openTabs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FileDiff {
  path: string;
  oldContent: string;
  newContent: string;
  status: 'created' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
}

export interface AgentActionPlan {
  taskSummary: string;
  steps: string[];
  targetFiles: string[];
}

export interface AgentTaskResult {
  success: boolean;
  plan?: AgentActionPlan;
  diffs: FileDiff[];
  explanation: string;
  checks?: { passed: boolean; message: string }[];
  summary: string;
  modifiedFiles: string[];
}

export interface ProjectCheckpoint {
  id: string;
  projectId: string;
  title: string;
  timestamp: number;
  files: Record<string, ProjectFile>;
}

export interface ConsoleLogEntry {
  id: string;
  type: 'log' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
  source?: string;
  line?: number;
}

export interface CodeAgentAttachment {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  size: number;
  base64: string;
}

export interface AgentHistoryMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  intent?: string;
  plan?: AgentActionPlan;
  changedFiles?: string[];
  diffs?: FileDiff[];
  explanation?: string;
  timestamp: string;
  isError?: boolean;
  attachments?: CodeAgentAttachment[];
}
