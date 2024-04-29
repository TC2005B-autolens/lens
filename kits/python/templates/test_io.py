import unittest
import unittest.mock
import runpy
from io import StringIO
import sys
import json
    
class TestIO(unittest.TestCase):
    AST_TARGET_MODULE = None
    AST_MOCKED_INPUT = None
    AST_EXPECTED_OUTPUT = None
    AST_TEST_NAME = None
    AST_JOB_ID = None

    def setUp(self):
        assert(self.AST_TARGET_MODULE is not None)
        assert(self.AST_MOCKED_INPUT is not None)
        assert(self.AST_EXPECTED_OUTPUT is not None)
        assert(self.AST_TEST_NAME is not None)
        assert(self.AST_JOB_ID is not None)

    @unittest.mock.patch('sys.stdout', new_callable=StringIO)
    @unittest.mock.patch('sys.stdin', new_callable=StringIO)
    def test_io(self, mock_stdin, mock_stdout):
        for line in self.AST_MOCKED_INPUT:
            mock_stdin.write(line)
            mock_stdin.write('\n')
        mock_stdin.seek(0)
        runpy.run_module(self.AST_TARGET_MODULE, run_name='__main__')
        
        self.output = mock_stdout.getvalue()
        self.assertEqual(self.output, self.AST_EXPECTED_OUTPUT)

def run_test():
    test = TestIO('test_io')
    result = test.run()
    test_result = {
        "id": TestIO.AST_TEST_NAME,
        "result": None,
    }

    if result.wasSuccessful():
        test_result['result'] = 'pass'
    elif result.errors:
        test_result['result'] = 'error'
        test_result['error'] = {
            "message": 'An error occured during testing',
            "detail": result.errors[0][1],
        }
    elif result.failures:
        test_result['result'] = 'fail'
        test_result['error'] = {
            "message": 'Test failed',
            "detail": result.failures[0][1],
            "expected": TestIO.AST_EXPECTED_OUTPUT,
            "actual": test.output,
        }
    
    return test_result

if __name__ == '__main__':
    sys.path.append('./')
    import unixsocket
    result = run_test()
    if unixsocket.send_result(result, TestIO.AST_JOB_ID, TestIO.AST_TEST_NAME):
        print(f'Sent result for test {TestIO.AST_TEST_NAME}')
