-- Copy to clipboard
vim.keymap.set("v", "<leader>y", '"+y', { desc = "Yank to clipboard" })
vim.keymap.set("n", "<leader>Y", '"+yg_', { desc = "Yank to clipboard (line end)" })
vim.keymap.set("n", "<leader>y", '"+y', { desc = "Yank to clipboard" })

-- Paste from clipboard
vim.keymap.set("v", "<leader>p", '"+p', { desc = "Paste from clipboard" })
vim.keymap.set("v", "<leader>P", '"+P', { desc = "Paste before from clipboard" })
vim.keymap.set("n", "<leader>p", '"+p', { desc = "Paste from clipboard" })
vim.keymap.set("n", "<leader>P", '"+P', { desc = "Paste before from clipboard" })

-- Highlight on yank
vim.api.nvim_create_autocmd("TextYankPost", {
	callback = function()
		vim.highlight.on_yank()
	end,
	desc = "Briefly highlight yanked text",
})

vim.keymap.set("n", "<leader>[", function()
	require("treesitter-context").go_to_context(vim.v.count1)
end, { silent = true })

local builtin = require("telescope.builtin")
vim.keymap.set("n", "<leader>ff", builtin.find_files, {})
vim.keymap.set("n", "<leader>fg", builtin.live_grep, {})
vim.keymap.set("n", "<leader><leader>", builtin.buffers, {})
vim.keymap.set("n", "<leader>fh", builtin.help_tags, {})
vim.keymap.set("n", "<leader>gc", builtin.git_commits, {})

vim.diagnostic.config({ virtual_text = false, float = { header = false, border = "rounded" } })
vim.keymap.set("n", "<leader>e", vim.diagnostic.open_float, { desc = "Open diagnostic" })

vim.api.nvim_set_keymap(
	"n",
	"<leader>ca",
	":Lspsaga code_action<CR>",
	{ noremap = true, silent = true, desc = "Show code actions" }
)
vim.api.nvim_set_keymap(
	"n",
	"gd",
	":Lspsaga peek_definition<CR>",
	{ noremap = true, silent = true, desc = "Peek definition" }
)
vim.api.nvim_set_keymap(
	"n",
	"<leader>gd",
	":Lspsaga goto_definition<CR>",
	{ noremap = true, silent = true, desc = "Go to definition" }
)
vim.api.nvim_set_keymap(
	"n",
	"<leader>tt",
	":Lspsaga term_toggle<CR>",
	{ noremap = true, silent = true, desc = "Toggle terminal" }
)
vim.api.nvim_set_keymap(
	"n",
	"[d",
	":Lspsaga diagnostic_jump_prev<CR>",
	{ noremap = true, silent = true, desc = "Go to previous diagnostic" }
)
vim.api.nvim_set_keymap(
	"n",
	"]d",
	":Lspsaga diagnostic_jump_next<CR>",
	{ noremap = true, silent = true, desc = "Go to next diagnostic" }
)
vim.api.nvim_set_keymap(
	"n",
	"<leader>fr",
	":Lspsaga finder<CR>",
	{ noremap = true, silent = true, desc = "Find references" }
)
vim.api.nvim_set_keymap("n", "<leader>o", ":Oil<CR>", { noremap = true, silent = true, desc = "Open Oil" })

-- To map <Esc> to exit terminal-mode: >vim
vim.keymap.set("t", "<Esc>", "<C-\\><C-n>", {})
-- To use `ALT+{h,j,k,l}` to navigate windows from any mode: >vim
vim.keymap.set("t", "<A-h>", "<C-\\><C-N><C-w>h", {})
vim.keymap.set("t", "<A-j>", "<C-\\><C-N><C-w>j", {})
vim.keymap.set("t", "<A-k>", "<C-\\><C-N><C-w>k", {})
vim.keymap.set("t", "<A-l>", "<C-\\><C-N><C-w>l", {})
vim.keymap.set("i", "<A-h>", "<C-\\><C-N><C-w>h", {})
vim.keymap.set("i", "<A-j>", "<C-\\><C-N><C-w>j", {})
vim.keymap.set("i", "<A-k>", "<C-\\><C-N><C-w>k", {})
vim.keymap.set("i", "<A-l>", "<C-\\><C-N><C-w>l", {})
vim.keymap.set("n", "<A-h>", "<C-w>h", {})
vim.keymap.set("n", "<A-j>", "<C-w>j", {})
vim.keymap.set("n", "<A-k>", "<C-w>k", {})
vim.keymap.set("n", "<A-l>", "<C-w>l", {})
