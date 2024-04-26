import ast

class FillTemplate(ast.NodeTransformer):
    def __init__(self, replacements):
        self.replacements = replacements

    def visit_Assign(self, node):
        self.generic_visit(node)
        if (len(node.targets) > 1): return node
        if not isinstance(node.targets[0], ast.Name): return node
        name = node.targets[0].id # type: str
        if name.startswith('AST_') and name in self.replacements:
            node.value = ast.Constant(value=self.replacements[name])
        return node

class FillFuncTemplate(FillTemplate):
    def visit_Call(self, node):
        if not isinstance(node.func, ast.Attribute): return node
        func_name = node.func.attr
        if not func_name.startswith('ast_call_'): return node
        assert func_name in self.replacements
        assert isinstance(self.replacements[func_name], list)
        function_params = [ast.parse(param, mode='eval').body for param in self.replacements[func_name]]

        return ast.Call(
            func=node.func,
            args=function_params,
            keywords=[]
        )

        