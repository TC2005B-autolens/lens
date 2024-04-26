import json
import ast

from .templater import FillFuncTemplate

with open('job.json') as f:
    job = json.load(f)

tests = job['tests']
main_file = next(file for file in job['files'] if file['main'])['path']
print(f"main file is {main_file}")

def handle_func(test):
    target_func = test['function']
    target_params = test['params']
    expected_output = test['out']
    test_id = test['id']
    ast_replacements = {
        'AST_TARGET_MODULE': f'submission.{main_file[:-3]}',
        'AST_TARGET_FUNCTION': target_func,
        'AST_TEST_NAME': test_id,
        # expected output is teacher provided, who already has complete control over the code ran
        # on the container. This is a safe eval.
        'AST_EXPECTED_OUTPUT': eval(expected_output), 
        'ast_call_target': target_params
    }

    
    with open(f'templates/test_function.py') as f:
        tree = ast.parse(f.read())

    templater = FillFuncTemplate(ast_replacements)
    tree = ast.fix_missing_locations(templater.generic_visit(tree))
    with open(f'{test_id}.py', 'w') as f:
        f.write(ast.unparse(tree))

if __name__ == "__main__":
    for test in tests:
        if test['type'] == 'function':
            handle_func(test)
