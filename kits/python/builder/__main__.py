import json
import ast
import os

from .templater import FillFuncTemplate

with open('job.json') as f:
    job = json.load(f)

tests = job['tests']
main_file = next(file for file in job['files'] if file['main'])['path']

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
        'AST_JOB_ID': job['id'],
        'ast_call_target': target_params
    }

    
    with open(f'templates/test_function.py') as f:
        tree = ast.parse(f.read())

    templater = FillFuncTemplate(ast_replacements)
    tree = ast.fix_missing_locations(templater.generic_visit(tree))
    output_file = f'dist/{test_id}.py'
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'x') as f:
        f.write(ast.unparse(tree))

if __name__ == "__main__":
    for test in tests:
        if test['type'] == 'function':
            handle_func(test)
