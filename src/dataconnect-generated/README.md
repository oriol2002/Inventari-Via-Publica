# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetMobilityElement*](#getmobilityelement)
  - [*ListPublicMobilityElements*](#listpublicmobilityelements)
- [**Mutations**](#mutations)
  - [*CreateMobilityElement*](#createmobilityelement)
  - [*LogMobilityElementEvent*](#logmobilityelementevent)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetMobilityElement
You can execute the `GetMobilityElement` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getMobilityElement(vars: GetMobilityElementVariables): QueryPromise<GetMobilityElementData, GetMobilityElementVariables>;

interface GetMobilityElementRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMobilityElementVariables): QueryRef<GetMobilityElementData, GetMobilityElementVariables>;
}
export const getMobilityElementRef: GetMobilityElementRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMobilityElement(dc: DataConnect, vars: GetMobilityElementVariables): QueryPromise<GetMobilityElementData, GetMobilityElementVariables>;

interface GetMobilityElementRef {
  ...
  (dc: DataConnect, vars: GetMobilityElementVariables): QueryRef<GetMobilityElementData, GetMobilityElementVariables>;
}
export const getMobilityElementRef: GetMobilityElementRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMobilityElementRef:
```typescript
const name = getMobilityElementRef.operationName;
console.log(name);
```

### Variables
The `GetMobilityElement` query requires an argument of type `GetMobilityElementVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetMobilityElementVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetMobilityElement` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMobilityElementData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetMobilityElement`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMobilityElement, GetMobilityElementVariables } from '@dataconnect/generated';

// The `GetMobilityElement` query requires an argument of type `GetMobilityElementVariables`:
const getMobilityElementVars: GetMobilityElementVariables = {
  id: ..., 
};

// Call the `getMobilityElement()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMobilityElement(getMobilityElementVars);
// Variables can be defined inline as well.
const { data } = await getMobilityElement({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMobilityElement(dataConnect, getMobilityElementVars);

console.log(data.mobilityElement);

// Or, you can use the `Promise` API.
getMobilityElement(getMobilityElementVars).then((response) => {
  const data = response.data;
  console.log(data.mobilityElement);
});
```

### Using `GetMobilityElement`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMobilityElementRef, GetMobilityElementVariables } from '@dataconnect/generated';

// The `GetMobilityElement` query requires an argument of type `GetMobilityElementVariables`:
const getMobilityElementVars: GetMobilityElementVariables = {
  id: ..., 
};

// Call the `getMobilityElementRef()` function to get a reference to the query.
const ref = getMobilityElementRef(getMobilityElementVars);
// Variables can be defined inline as well.
const ref = getMobilityElementRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMobilityElementRef(dataConnect, getMobilityElementVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mobilityElement);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mobilityElement);
});
```

## ListPublicMobilityElements
You can execute the `ListPublicMobilityElements` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listPublicMobilityElements(): QueryPromise<ListPublicMobilityElementsData, undefined>;

interface ListPublicMobilityElementsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListPublicMobilityElementsData, undefined>;
}
export const listPublicMobilityElementsRef: ListPublicMobilityElementsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listPublicMobilityElements(dc: DataConnect): QueryPromise<ListPublicMobilityElementsData, undefined>;

interface ListPublicMobilityElementsRef {
  ...
  (dc: DataConnect): QueryRef<ListPublicMobilityElementsData, undefined>;
}
export const listPublicMobilityElementsRef: ListPublicMobilityElementsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listPublicMobilityElementsRef:
```typescript
const name = listPublicMobilityElementsRef.operationName;
console.log(name);
```

### Variables
The `ListPublicMobilityElements` query has no variables.
### Return Type
Recall that executing the `ListPublicMobilityElements` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListPublicMobilityElementsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListPublicMobilityElements`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listPublicMobilityElements } from '@dataconnect/generated';


// Call the `listPublicMobilityElements()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listPublicMobilityElements();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listPublicMobilityElements(dataConnect);

console.log(data.mobilityElements);

// Or, you can use the `Promise` API.
listPublicMobilityElements().then((response) => {
  const data = response.data;
  console.log(data.mobilityElements);
});
```

### Using `ListPublicMobilityElements`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listPublicMobilityElementsRef } from '@dataconnect/generated';


// Call the `listPublicMobilityElementsRef()` function to get a reference to the query.
const ref = listPublicMobilityElementsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listPublicMobilityElementsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mobilityElements);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mobilityElements);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateMobilityElement
You can execute the `CreateMobilityElement` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createMobilityElement(vars: CreateMobilityElementVariables): MutationPromise<CreateMobilityElementData, CreateMobilityElementVariables>;

interface CreateMobilityElementRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateMobilityElementVariables): MutationRef<CreateMobilityElementData, CreateMobilityElementVariables>;
}
export const createMobilityElementRef: CreateMobilityElementRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createMobilityElement(dc: DataConnect, vars: CreateMobilityElementVariables): MutationPromise<CreateMobilityElementData, CreateMobilityElementVariables>;

interface CreateMobilityElementRef {
  ...
  (dc: DataConnect, vars: CreateMobilityElementVariables): MutationRef<CreateMobilityElementData, CreateMobilityElementVariables>;
}
export const createMobilityElementRef: CreateMobilityElementRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createMobilityElementRef:
```typescript
const name = createMobilityElementRef.operationName;
console.log(name);
```

### Variables
The `CreateMobilityElement` mutation requires an argument of type `CreateMobilityElementVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateMobilityElementVariables {
  typeId: UUIDString;
  userId: UUIDString;
  name: string;
  status: string;
}
```
### Return Type
Recall that executing the `CreateMobilityElement` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateMobilityElementData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateMobilityElementData {
  mobilityElement_insert: MobilityElement_Key;
}
```
### Using `CreateMobilityElement`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createMobilityElement, CreateMobilityElementVariables } from '@dataconnect/generated';

// The `CreateMobilityElement` mutation requires an argument of type `CreateMobilityElementVariables`:
const createMobilityElementVars: CreateMobilityElementVariables = {
  typeId: ..., 
  userId: ..., 
  name: ..., 
  status: ..., 
};

// Call the `createMobilityElement()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createMobilityElement(createMobilityElementVars);
// Variables can be defined inline as well.
const { data } = await createMobilityElement({ typeId: ..., userId: ..., name: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createMobilityElement(dataConnect, createMobilityElementVars);

console.log(data.mobilityElement_insert);

// Or, you can use the `Promise` API.
createMobilityElement(createMobilityElementVars).then((response) => {
  const data = response.data;
  console.log(data.mobilityElement_insert);
});
```

### Using `CreateMobilityElement`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createMobilityElementRef, CreateMobilityElementVariables } from '@dataconnect/generated';

// The `CreateMobilityElement` mutation requires an argument of type `CreateMobilityElementVariables`:
const createMobilityElementVars: CreateMobilityElementVariables = {
  typeId: ..., 
  userId: ..., 
  name: ..., 
  status: ..., 
};

// Call the `createMobilityElementRef()` function to get a reference to the mutation.
const ref = createMobilityElementRef(createMobilityElementVars);
// Variables can be defined inline as well.
const ref = createMobilityElementRef({ typeId: ..., userId: ..., name: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createMobilityElementRef(dataConnect, createMobilityElementVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.mobilityElement_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.mobilityElement_insert);
});
```

## LogMobilityElementEvent
You can execute the `LogMobilityElementEvent` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
logMobilityElementEvent(vars: LogMobilityElementEventVariables): MutationPromise<LogMobilityElementEventData, LogMobilityElementEventVariables>;

interface LogMobilityElementEventRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: LogMobilityElementEventVariables): MutationRef<LogMobilityElementEventData, LogMobilityElementEventVariables>;
}
export const logMobilityElementEventRef: LogMobilityElementEventRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
logMobilityElementEvent(dc: DataConnect, vars: LogMobilityElementEventVariables): MutationPromise<LogMobilityElementEventData, LogMobilityElementEventVariables>;

interface LogMobilityElementEventRef {
  ...
  (dc: DataConnect, vars: LogMobilityElementEventVariables): MutationRef<LogMobilityElementEventData, LogMobilityElementEventVariables>;
}
export const logMobilityElementEventRef: LogMobilityElementEventRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the logMobilityElementEventRef:
```typescript
const name = logMobilityElementEventRef.operationName;
console.log(name);
```

### Variables
The `LogMobilityElementEvent` mutation requires an argument of type `LogMobilityElementEventVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface LogMobilityElementEventVariables {
  mobilityElementId: UUIDString;
  userId: UUIDString;
  description: string;
  eventType: string;
  cost?: number | null;
}
```
### Return Type
Recall that executing the `LogMobilityElementEvent` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `LogMobilityElementEventData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface LogMobilityElementEventData {
  logEntry_insert: LogEntry_Key;
}
```
### Using `LogMobilityElementEvent`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, logMobilityElementEvent, LogMobilityElementEventVariables } from '@dataconnect/generated';

// The `LogMobilityElementEvent` mutation requires an argument of type `LogMobilityElementEventVariables`:
const logMobilityElementEventVars: LogMobilityElementEventVariables = {
  mobilityElementId: ..., 
  userId: ..., 
  description: ..., 
  eventType: ..., 
  cost: ..., // optional
};

// Call the `logMobilityElementEvent()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await logMobilityElementEvent(logMobilityElementEventVars);
// Variables can be defined inline as well.
const { data } = await logMobilityElementEvent({ mobilityElementId: ..., userId: ..., description: ..., eventType: ..., cost: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await logMobilityElementEvent(dataConnect, logMobilityElementEventVars);

console.log(data.logEntry_insert);

// Or, you can use the `Promise` API.
logMobilityElementEvent(logMobilityElementEventVars).then((response) => {
  const data = response.data;
  console.log(data.logEntry_insert);
});
```

### Using `LogMobilityElementEvent`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, logMobilityElementEventRef, LogMobilityElementEventVariables } from '@dataconnect/generated';

// The `LogMobilityElementEvent` mutation requires an argument of type `LogMobilityElementEventVariables`:
const logMobilityElementEventVars: LogMobilityElementEventVariables = {
  mobilityElementId: ..., 
  userId: ..., 
  description: ..., 
  eventType: ..., 
  cost: ..., // optional
};

// Call the `logMobilityElementEventRef()` function to get a reference to the mutation.
const ref = logMobilityElementEventRef(logMobilityElementEventVars);
// Variables can be defined inline as well.
const ref = logMobilityElementEventRef({ mobilityElementId: ..., userId: ..., description: ..., eventType: ..., cost: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = logMobilityElementEventRef(dataConnect, logMobilityElementEventVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.logEntry_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.logEntry_insert);
});
```

