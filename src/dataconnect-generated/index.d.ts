import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface CreateMobilityElementData {
  mobilityElement_insert: MobilityElement_Key;
}

export interface CreateMobilityElementVariables {
  typeId: UUIDString;
  userId: UUIDString;
  name: string;
  status: string;
}

export interface ElementType_Key {
  id: UUIDString;
  __typename?: 'ElementType_Key';
}

export interface GetMobilityElementData {
  mobilityElement?: {
    id: UUIDString;
    type: {
      id: UUIDString;
      name: string;
      description?: string | null;
    } & ElementType_Key;
      user: {
        id: UUIDString;
        displayName: string;
        email?: string | null;
      } & User_Key;
        name: string;
        description?: string | null;
        status: string;
        brand?: string | null;
        model?: string | null;
        imageUrl?: string | null;
        serialNumber?: string | null;
        isPublic?: boolean | null;
        createdAt: TimestampString;
  } & MobilityElement_Key;
}

export interface GetMobilityElementVariables {
  id: UUIDString;
}

export interface ListPublicMobilityElementsData {
  mobilityElements: ({
    id: UUIDString;
    type: {
      id: UUIDString;
      name: string;
    } & ElementType_Key;
      name: string;
      description?: string | null;
      brand?: string | null;
      model?: string | null;
      imageUrl?: string | null;
  } & MobilityElement_Key)[];
}

export interface LogEntry_Key {
  id: UUIDString;
  __typename?: 'LogEntry_Key';
}

export interface LogMobilityElementEventData {
  logEntry_insert: LogEntry_Key;
}

export interface LogMobilityElementEventVariables {
  mobilityElementId: UUIDString;
  userId: UUIDString;
  description: string;
  eventType: string;
  cost?: number | null;
}

export interface MobilityElement_Key {
  id: UUIDString;
  __typename?: 'MobilityElement_Key';
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface CreateMobilityElementRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateMobilityElementVariables): MutationRef<CreateMobilityElementData, CreateMobilityElementVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateMobilityElementVariables): MutationRef<CreateMobilityElementData, CreateMobilityElementVariables>;
  operationName: string;
}
export const createMobilityElementRef: CreateMobilityElementRef;

export function createMobilityElement(vars: CreateMobilityElementVariables): MutationPromise<CreateMobilityElementData, CreateMobilityElementVariables>;
export function createMobilityElement(dc: DataConnect, vars: CreateMobilityElementVariables): MutationPromise<CreateMobilityElementData, CreateMobilityElementVariables>;

interface GetMobilityElementRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMobilityElementVariables): QueryRef<GetMobilityElementData, GetMobilityElementVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetMobilityElementVariables): QueryRef<GetMobilityElementData, GetMobilityElementVariables>;
  operationName: string;
}
export const getMobilityElementRef: GetMobilityElementRef;

export function getMobilityElement(vars: GetMobilityElementVariables): QueryPromise<GetMobilityElementData, GetMobilityElementVariables>;
export function getMobilityElement(dc: DataConnect, vars: GetMobilityElementVariables): QueryPromise<GetMobilityElementData, GetMobilityElementVariables>;

interface LogMobilityElementEventRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: LogMobilityElementEventVariables): MutationRef<LogMobilityElementEventData, LogMobilityElementEventVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: LogMobilityElementEventVariables): MutationRef<LogMobilityElementEventData, LogMobilityElementEventVariables>;
  operationName: string;
}
export const logMobilityElementEventRef: LogMobilityElementEventRef;

export function logMobilityElementEvent(vars: LogMobilityElementEventVariables): MutationPromise<LogMobilityElementEventData, LogMobilityElementEventVariables>;
export function logMobilityElementEvent(dc: DataConnect, vars: LogMobilityElementEventVariables): MutationPromise<LogMobilityElementEventData, LogMobilityElementEventVariables>;

interface ListPublicMobilityElementsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListPublicMobilityElementsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListPublicMobilityElementsData, undefined>;
  operationName: string;
}
export const listPublicMobilityElementsRef: ListPublicMobilityElementsRef;

export function listPublicMobilityElements(): QueryPromise<ListPublicMobilityElementsData, undefined>;
export function listPublicMobilityElements(dc: DataConnect): QueryPromise<ListPublicMobilityElementsData, undefined>;

