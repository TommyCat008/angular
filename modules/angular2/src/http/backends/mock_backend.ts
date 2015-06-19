import {Injectable} from 'angular2/di';
import {Request} from 'angular2/src/http/static_request';
import {Response} from 'angular2/src/http/static_response';
import {ReadyStates} from 'angular2/src/http/enums';
import {Connection, ConnectionBackend} from 'angular2/src/http/interfaces';
import {ObservableWrapper, EventEmitter} from 'angular2/src/facade/async';
import {isPresent} from 'angular2/src/facade/lang';
import {IMPLEMENTS, BaseException} from 'angular2/src/facade/lang';

/**
 *
 * Connection class used by MockBackend
 *
 * This class is typically not instantiated directly, but instances can be retrieved by subscribing
 *to the `connections` Observable of
 * {@link MockBackend} in order to mock responses to requests.
 *
 **/
@IMPLEMENTS(Connection)
export class MockConnection {
  // TODO Name `readyState` should change to be more generic, and states could be made to be more
  // descriptive than XHR states.
  /**
   * Describes the state of the connection, based on `XMLHttpRequest.readyState`, but with
   * additional states. For example, state 5 indicates an aborted connection.
   */
  readyState: ReadyStates;

  /**
   * {@link Request} instance used to create the connection.
   */
  request: Request;

  /**
   * [RxJS
   * Observable](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/observable.md)
   * of {@link Response}. Can be subscribed to in order to be notified when a response is available.
   */
  response: EventEmitter;

  constructor(req: Request) {
    this.response = new EventEmitter();
    this.readyState = ReadyStates.OPEN;
    this.request = req;
  }

  /**
   * Changes the `readyState` of the connection to a custom state of 5 (cancelled).
   */
  dispose() {
    if (this.readyState !== ReadyStates.DONE) {
      this.readyState = ReadyStates.CANCELLED;
    }
  }

  /**
   * Sends a mock response to the connection. This response is the value that is emitted to the
   * `Observable` returned by {@link Http}.
   *
   * #Example
   *
   * ```
   * var connection;
   * backend.connections.subscribe(c => connection = c);
   * http.request('data.json').subscribe(res => console.log(res.text()));
   * connection.mockRespond(new Response('fake response')); //logs 'fake response'
   * ```
   *
   */
  mockRespond(res: Response) {
    if (this.readyState === ReadyStates.DONE || this.readyState === ReadyStates.CANCELLED) {
      throw new BaseException('Connection has already been resolved');
    }
    this.readyState = ReadyStates.DONE;
    ObservableWrapper.callNext(this.response, res);
    ObservableWrapper.callReturn(this.response);
  }

  /**
   * Not yet implemented!
   *
   * Sends the provided {@link Response} to the `downloadObserver` of the `Request`
   * associated with this connection.
   */
  mockDownload(res: Response) {
    // this.request.downloadObserver.onNext(res);
    // if (res.bytesLoaded === res.totalBytes) {
    //   this.request.downloadObserver.onCompleted();
    // }
  }

  // TODO(jeffbcross): consider using Response type
  /**
   * Emits the provided error object as an error to the {@link Response} observable returned
   * from {@link Http}.
   */
  mockError(err?) {
    // Matches XHR semantics
    this.readyState = ReadyStates.DONE;
    ObservableWrapper.callThrow(this.response, err);
    ObservableWrapper.callReturn(this.response);
  }
}

/**
 * A mock backend for testing the {@link Http} service.
 *
 * This class can be injected in tests, and should be used to override bindings
 * to other backends, such as {@link XHRBackend}.
 *
 * #Example
 *
 * ```
 * import {MockBackend, DefaultOptions, Http} from 'angular2/http';
 * it('should get some data', inject([AsyncTestCompleter], (async) => {
 *   var connection;
 *   var injector = Injector.resolveAndCreate([
 *     MockBackend,
 *     bind(Http).toFactory((backend, defaultOptions) => {
 *       return new Http(backend, defaultOptions)
 *     }, [MockBackend, DefaultOptions])]);
 *   var http = injector.get(Http);
 *   var backend = injector.get(MockBackend);
 *   //Assign any newly-created connection to local variable
 *   backend.connections.subscribe(c => connection = c);
 *   http.request('data.json').subscribe((res) => {
 *     expect(res.text()).toBe('awesome');
 *     async.done();
 *   });
 *   connection.mockRespond(new Response('awesome'));
 * }));
 * ```
 *
 * This method only exists in the mock implementation, not in real Backends.
 **/
@Injectable()
@IMPLEMENTS(ConnectionBackend)
export class MockBackend {
  /**
   * [RxJS
   * Subject](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/subjects/subject.md)
   * of {@link MockConnection} instances that have been created by this backend. Can be subscribed
   * to in order to respond to connections.
   *
   * #Example
   *
   * ```
   * import {MockBackend, Http, BaseRequestOptions} from 'angular2/http';
   * import {Injector} from 'angular2/di';
   *
   * it('should get a response', () => {
   *   var connection; //this will be set when a new connection is emitted from the backend.
   *   var text; //this will be set from mock response
   *   var injector = Injector.resolveAndCreate([
   *     MockBackend,
   *     bind(Http).toFactory(backend, options) {
   *       return new Http(backend, options);
   *     }, [MockBackend, BaseRequestOptions]]);
   *   var backend = injector.get(MockBackend);
   *   var http = injector.get(Http);
   *   backend.connections.subscribe(c => connection = c);
   *   http.request('something.json').subscribe(res => {
   *     text = res.text();
   *   });
   *   connection.mockRespond(new Response('Something'));
   *   expect(text).toBe('Something');
   * });
   * ```
   *
   * This property only exists in the mock implementation, not in real Backends.
   */
  connections: EventEmitter;  //<MockConnection>

  /**
   * An array representation of `connections`. This array will be updated with each connection that
   * is created by this backend.
   *
   * This property only exists in the mock implementation, not in real Backends.
   */
  connectionsArray: Array<MockConnection>;
  /**
   * [Observable](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/observable.md)
   * of {@link MockConnection} instances that haven't yet been resolved (i.e. with a `readyState`
   * less than 4). Used internally to verify that no connections are pending via the
   * `verifyNoPendingRequests` method.
   *
   * This property only exists in the mock implementation, not in real Backends.
   */
  pendingConnections: EventEmitter;  //<MockConnection>
  constructor() {
    this.connectionsArray = [];
    this.connections = new EventEmitter();
    ObservableWrapper.subscribe(this.connections,
                                connection => this.connectionsArray.push(connection));
    this.pendingConnections = new EventEmitter();
    // Observable.fromArray(this.connectionsArray).filter((c) => c.readyState < ReadyStates.DONE);
  }

  /**
   * Checks all connections, and raises an exception if any connection has not received a response.
   *
   * This method only exists in the mock implementation, not in real Backends.
   */
  verifyNoPendingRequests() {
    let pending = 0;
    ObservableWrapper.subscribe(this.pendingConnections, c => pending++);
    if (pending > 0) throw new BaseException(`${pending} pending connections to be resolved`);
  }

  /**
   * Can be used in conjunction with `verifyNoPendingRequests` to resolve any not-yet-resolve
   * connections, if it's expected that there are connections that have not yet received a response.
   *
   * This method only exists in the mock implementation, not in real Backends.
   */
  resolveAllConnections() { ObservableWrapper.subscribe(this.connections, c => c.readyState = 4); }

  /**
   * Creates a new {@link MockConnection}. This is equivalent to calling `new
   * MockConnection()`, except that it also will emit the new `Connection` to the `connections`
   * observable of this `MockBackend` instance. This method will usually only be used by tests
   * against the framework itself, not by end-users.
   */
  createConnection(req: Request) {
    if (!isPresent(req) || !(req instanceof Request)) {
      throw new BaseException(`createConnection requires an instance of Request, got ${req}`);
    }
    let connection = new MockConnection(req);
    ObservableWrapper.callNext(this.connections, connection);
    return connection;
  }
}
