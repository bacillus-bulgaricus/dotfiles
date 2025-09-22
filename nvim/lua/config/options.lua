vim.opt.wildignore = { "*.o", "*.a", "__pycache__" }
vim.opt.formatoptions = { n = true, j = true, t = true }
vim.opt.number = true
vim.opt.relativenumber = true
vim.opt.cursorline = true   -- Uncomment to enable cursor line highlighting
vim.opt.conceallevel = 2
vim.opt.scrolloff = 5
vim.opt.swapfile = false
-- Let terminal handle cursor shape and color
vim.api.nvim_set_hl(0, "Cursor", {})
