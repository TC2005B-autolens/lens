# pylint: disable=super-with-arguments,keyword-arg-before-vararg,ungrouped-imports:

# Code taken from https://github.com/pronovic/vplan/pull/29

import socket
import urllib3
import requests
from requests.adapters import HTTPAdapter
from requests.compat import unquote, urlparse

# The following was adapted from some code from docker-py
# https://github.com/docker/docker-py/blob/master/docker/transport/unixconn.py
class UnixHTTPConnection(urllib3.connection.HTTPConnection):
    def __init__(self, unix_socket_url, timeout=60):
        """Create an HTTP connection to a unix domain socket
        :param unix_socket_url: A URL with a scheme of 'http+unix' and the
        netloc is a percent-encoded path to a unix domain socket. E.g.:
        'http+unix://%2Ftmp%2Fprofilesvc.sock/status/pid'
        """
        super(UnixHTTPConnection, self).__init__("localhost", timeout=timeout)
        self.unix_socket_url = unix_socket_url
        self.timeout = timeout
        self.sock = None

    def __del__(self):  # base class does not have d'tor
        if self.sock:
            self.sock.close()

    def connect(self):
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.settimeout(self.timeout)
        socket_path = unquote(urlparse(self.unix_socket_url).netloc)
        sock.connect(socket_path)
        self.sock = sock


class UnixHTTPConnectionPool(urllib3.connectionpool.HTTPConnectionPool):
    def __init__(self, socket_path, timeout=60):
        super(UnixHTTPConnectionPool, self).__init__("localhost", timeout=timeout)
        self.socket_path = socket_path
        self.timeout = timeout

    def _new_conn(self):
        return UnixHTTPConnection(self.socket_path, self.timeout)


class UnixAdapter(HTTPAdapter):
    def __init__(self, timeout=60, pool_connections=25, *args, **kwargs):
        super(UnixAdapter, self).__init__(*args, **kwargs)
        self.timeout = timeout
        self.pools = urllib3._collections.RecentlyUsedContainer(pool_connections, dispose_func=lambda p: p.close())

    def get_connection(self, url, proxies=None):
        proxies = proxies or {}
        proxy = proxies.get(urlparse(url.lower()).scheme)

        if proxy:
            raise ValueError("%s does not support specifying proxies" % self.__class__.__name__)

        with self.pools.lock:
            pool = self.pools.get(url)
            if pool:
                return pool

            pool = UnixHTTPConnectionPool(url, self.timeout)
            self.pools[url] = pool

        return pool

    def request_url(self, request, proxies):
        return request.path_url

    def close(self):
        self.pools.clear()


DEFAULT_SCHEME = "http+unix://"

class Session(requests.Session):
    def __init__(self, url_scheme=DEFAULT_SCHEME, *args, **kwargs):
        super(Session, self).__init__(*args, **kwargs)
        self.mount(url_scheme, UnixAdapter())

def send_result(result, job_id, test_name):
    with Session() as sesh:
        base_url = 'http+unix://%2Fvar%2Frun%2Flens%2Flens.sock'
        url = f'{base_url}/jobs/{job_id}/result?test={test_name}'
        res = sesh.post(url, json=result)
        res.raise_for_status()
        return True
