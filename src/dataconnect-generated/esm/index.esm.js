import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'inventari-mobilitat',
  location: 'europe-west3'
};

export const createMobilityElementRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateMobilityElement', inputVars);
}
createMobilityElementRef.operationName = 'CreateMobilityElement';

export function createMobilityElement(dcOrVars, vars) {
  return executeMutation(createMobilityElementRef(dcOrVars, vars));
}

export const getMobilityElementRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMobilityElement', inputVars);
}
getMobilityElementRef.operationName = 'GetMobilityElement';

export function getMobilityElement(dcOrVars, vars) {
  return executeQuery(getMobilityElementRef(dcOrVars, vars));
}

export const logMobilityElementEventRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'LogMobilityElementEvent', inputVars);
}
logMobilityElementEventRef.operationName = 'LogMobilityElementEvent';

export function logMobilityElementEvent(dcOrVars, vars) {
  return executeMutation(logMobilityElementEventRef(dcOrVars, vars));
}

export const listPublicMobilityElementsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListPublicMobilityElements');
}
listPublicMobilityElementsRef.operationName = 'ListPublicMobilityElements';

export function listPublicMobilityElements(dc) {
  return executeQuery(listPublicMobilityElementsRef(dc));
}

