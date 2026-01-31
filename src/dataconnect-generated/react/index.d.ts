import { CreateMobilityElementData, CreateMobilityElementVariables, GetMobilityElementData, GetMobilityElementVariables, LogMobilityElementEventData, LogMobilityElementEventVariables, ListPublicMobilityElementsData } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateMobilityElement(options?: useDataConnectMutationOptions<CreateMobilityElementData, FirebaseError, CreateMobilityElementVariables>): UseDataConnectMutationResult<CreateMobilityElementData, CreateMobilityElementVariables>;
export function useCreateMobilityElement(dc: DataConnect, options?: useDataConnectMutationOptions<CreateMobilityElementData, FirebaseError, CreateMobilityElementVariables>): UseDataConnectMutationResult<CreateMobilityElementData, CreateMobilityElementVariables>;

export function useGetMobilityElement(vars: GetMobilityElementVariables, options?: useDataConnectQueryOptions<GetMobilityElementData>): UseDataConnectQueryResult<GetMobilityElementData, GetMobilityElementVariables>;
export function useGetMobilityElement(dc: DataConnect, vars: GetMobilityElementVariables, options?: useDataConnectQueryOptions<GetMobilityElementData>): UseDataConnectQueryResult<GetMobilityElementData, GetMobilityElementVariables>;

export function useLogMobilityElementEvent(options?: useDataConnectMutationOptions<LogMobilityElementEventData, FirebaseError, LogMobilityElementEventVariables>): UseDataConnectMutationResult<LogMobilityElementEventData, LogMobilityElementEventVariables>;
export function useLogMobilityElementEvent(dc: DataConnect, options?: useDataConnectMutationOptions<LogMobilityElementEventData, FirebaseError, LogMobilityElementEventVariables>): UseDataConnectMutationResult<LogMobilityElementEventData, LogMobilityElementEventVariables>;

export function useListPublicMobilityElements(options?: useDataConnectQueryOptions<ListPublicMobilityElementsData>): UseDataConnectQueryResult<ListPublicMobilityElementsData, undefined>;
export function useListPublicMobilityElements(dc: DataConnect, options?: useDataConnectQueryOptions<ListPublicMobilityElementsData>): UseDataConnectQueryResult<ListPublicMobilityElementsData, undefined>;
