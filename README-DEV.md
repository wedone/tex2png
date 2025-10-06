本仓库的开发指南（简要）

为保证所有提交信息为中文，本仓库在 `.githooks/commit-msg` 中提供了一个 commit-msg 钩子脚本。

启用方法（在本地仓库中执行一次）：

1. 设置 hooksPath：

   git config core.hooksPath .githooks

2. 现在本地的提交信息会被 `.githooks/commit-msg` 校验，要求提交信息中包含至少一个中文字符。

跳过校验（临时）示例：

Windows PowerShell:

   $env:SKIP_COMMIT_MSG_CHECK=1; git commit -m "Merge: 例外提交"

或者在 Unix shell：

   SKIP_COMMIT_MSG_CHECK=1 git commit -m "Merge: exception"

注意：这只在你本地启用了 hooksPath 后有效；CI/服务器端不会默认使用仓库中的 .githooks 文件。
