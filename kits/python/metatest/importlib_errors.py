import importlib

if __name__ == '__main__':
    print('Importing test_function')
    try:
        test_function = importlib.import_module('templates.test_functison')
        print('Imported successfully')
    except ImportError as e:
        print('Module error: ', e)
    except Exception as e:
        print('Module has error!')
        print(e)
