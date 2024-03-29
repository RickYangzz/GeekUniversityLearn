const scan = require('./lexer.js')

let syntax = {
    Program: [['StatementList', 'EOF']],
    StatementList: [
        ['Statement'],
        ['StatementList', 'Statement']
    ],
    Statement: [
        ['ExpressionStatement'],
        ['IfStatement'],
        ['VariableDeclaration'],
        ['FunctionDeclaration']
    ],
    IfStatement: [
        ['if', '(', 'Expression', ')', 'Statement']
    ],
    VariableDeclaration: [
        ['var', 'Identifier', ';'],
        ['let', 'Identifier', ';']
    ],
    FunctionDeclaration: [
        ['function', 'Identifier', '(', ')', '{', 'StatementList', '}']
    ],
    ExpressionStatement: [
        ['Expression', ';'],
    ],
    Expression: [
        ['AdditiveExpression'],
    ],
    AdditiveExpression:[
        ['MultiplicativeExpression'],
        ['AdditiveExpression', '+', 'MultiplicativeExpression'],
        ['AdditiveExpression', '-', 'MultiplicativeExpression'],
    ],
    MultiplicativeExpression: [
        ['PrimaryExpression'],
        ['MultiplicativeExpression', '*', 'PrimaryExpression'],
        ['MultiplicativeExpression', '/', 'PrimaryExpression']
    ],
    PrimaryExpression: [
        ['(', 'Expression', ')'],
        ['Literal'],
        ['Idenfitier']
    ],
    Literal: [
        ['Number'],
        ['String'],
        ['Boolean'],
        ['Null'],
        ['RegularExpression']
    ]
}

let hash = {}

function closure(state) {
    hash[JSON.stringify(state)] = state
    let queue = []
    for (let symbol in state) {
        queue.push(symbol)
    }
    while (queue.length) {
        let symbol = queue.shift()
        if (syntax[symbol]) {
            for (let rule of syntax[symbol]) {
                if (!state[rule[0]]) {
                    if (symbol.match(/^\$/)) return
                    queue.push(rule[0])
                }
                let current = state
                for (let part of rule) {
                    if (!current[part]) {
                        current[part] = {}
                    }
                    current = current[part]
                }
                current.$reduceType = symbol
                current.$reduceLength = rule.length
            }
        }
    }

    for (let symbol in state) {
        if (symbol.match(/^\$/)) return
        //避免重复工作，已经解析的对象直接拿来用。
        if (hash[JSON.stringify(state[symbol])]) {
            state[symbol] = hash[JSON.stringify(state[symbol])]
        } else {
            closure(state[symbol])
        }
    }
}

function parse(source) {
    let stack = [start]
    let symbolStack = []
    function reduce() {
        let state = stack[stack.length - 1]
        if (state.$reduceType) {
            let children = []
            for (let i = 0; i < state.$reduceLength; i++) {
                stack.pop()
                children.push(symbolStack.pop())
            }
            //create a nonterminal and shift
            return {
                type: state.$reduceType,
                children: children.reverse()
            }
        }
    }
    function shift(symbol) {
        let state = stack[stack.length - 1]
        if (symbol.type in state) {
            stack.push(state[symbol.type])
            symbolStack.push(symbol)
        } else {
            //reduce to non-terminal symbols
            shift(reduce())
            shift(symbol)
        }
    }
    //terminal symbols
    for (let symbol of scan(source)) {
        shift(symbol)
    }
    return reduce()
}

let evaluator = {
    Program(node) {
        return evaluate(node.children[0])
    },
    StatementList(node) {
        if (node.children.length === 1) {
            return evaluate(node.children[0])
        } else {
            evaluate(node.children[0])
            return evaluate(node.children[1])
        }
    },
    Statement(node) {
        return evaluate(node.children[0])
    },
    VariableDeclaration(node) {
        console.log('Declare variable', node.children[1].name)
    },
    EOF() {
        return null
    }
}

function evaluate(node) {
    if (evaluator[node.type]) {
        return evaluator[node.type](node)
    }
}

let end = {
    $isEnd: true
}

let start = {
    'Program': end
}

closure(start)

let source = `
    let a;
    let b;
`

let tree = parse(source)
evaluate(tree)
