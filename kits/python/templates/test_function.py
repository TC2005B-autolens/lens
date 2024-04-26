# Inspiración de templates de https://github.com/hhursev/recipe-scrapers/
import importlib
import sys
import traceback
import json

class FunctionTest:
    # To be populated by AST
    AST_TARGET_MODULE = None
    AST_TARGET_FUNCTION = None
    AST_TEST_NAME = None
    AST_EXPECTED_OUTPUT = None
    
    def __init__(self):
        assert(self.AST_TARGET_MODULE is not None)
        assert(self.AST_TARGET_FUNCTION is not None)
        assert(self.AST_TEST_NAME is not None)
        assert(self.AST_EXPECTED_OUTPUT is not None)

        self.error = None

        try:
            self.module = importlib.import_module(self.AST_TARGET_MODULE)
        except ImportError:
            raise Exception(f"Module {self.AST_TARGET_MODULE} not found")
        except Exception as e:
            print(f"Error importing module {self.AST_TARGET_MODULE}: {e}")
            exc_type, exc_value, exc_traceback = sys.exc_info()
            self.error = {
                "type": str(exc_type),
                "message": str(exc_value),
                "detail": traceback.format_exception(exc_type, exc_value, exc_traceback)
            }
        
        if not hasattr(self.module, self.AST_TARGET_FUNCTION):
            raise AttributeError(f"Function {self.AST_TARGET_FUNCTION} not found in module {self.AST_TARGET_MODULE}")
        self.ast_call_target = getattr(self.module, self.AST_TARGET_FUNCTION)

    def execute(self):
        try:
            result = self.ast_call_target()
        except Exception as e:
            print(f"Error executing function {self.AST_TARGET_FUNCTION}: {e}")
            exc_type, exc_value, exc_traceback = sys.exc_info()
            self.error = {
                "type": str(exc_type),
                "message": str(exc_value),
                "detail": traceback.format_exception(exc_type, exc_value, exc_traceback)
            }
            return None
        
        test_result = {
            "id": self.AST_TEST_NAME,
            "result": None,
        }

        if self.error is not None:
            test_result["result"] = "fail"
            test_result["error"] = self.error
        elif result == self.AST_EXPECTED_OUTPUT:
            test_result["result"] = "pass"
        else:
            test_result["result"] = "fail"
            test_result["expected"] = self.AST_EXPECTED_OUTPUT
            test_result["actual"] = result
        
        return test_result
    
def main():
    sys.path.append('./')
    test = FunctionTest()
    output = test.execute()
    print(json.dumps(output))

if __name__ == '__main__':
    main()
