const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'inventari-mobilitat',
  location: 'europe-west3'
};
exports.connectorConfig = connectorConfig;

const createMobilityElementRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateMobilityElement', inputVars);
}
createMobilityElementRef.operationName = 'CreateMobilityElement';
exports.createMobilityElementRef = createMobilityElementRef;

exports.createMobilityElement = function createMobilityElement(dcOrVars, vars) {
  return executeMutation(createMobilityElementRef(dcOrVars, vars));
};

const getMobilityElementRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMobilityElement', inputVars);
}
getMobilityElementRef.operationName = 'GetMobilityElement';
exports.getMobilityElementRef = getMobilityElementRef;

exports.getMobilityElement = function getMobilityElement(dcOrVars, vars) {
  return executeQuery(getMobilityElementRef(dcOrVars, vars));
};

const logMobilityElementEventRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'LogMobilityElementEvent', inputVars);
}
logMobilityElementEventRef.operationName = 'LogMobilityElementEvent';
exports.logMobilityElementEventRef = logMobilityElementEventRef;

exports.logMobilityElementEvent = function logMobilityElementEvent(dcOrVars, vars) {
  return executeMutation(logMobilityElementEventRef(dcOrVars, vars));
};

const listPublicMobilityElementsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListPublicMobilityElements');
}
listPublicMobilityElementsRef.operationName = 'ListPublicMobilityElements';
exports.listPublicMobilityElementsRef = listPublicMobilityElementsRef;

exports.listPublicMobilityElements = function listPublicMobilityElements(dc) {
  return executeQuery(listPublicMobilityElementsRef(dc));
};
