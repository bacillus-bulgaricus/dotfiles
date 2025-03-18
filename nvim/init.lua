-- PLUGINS
-- For terminal prompt: https://github.com/starship/starship
require("config.lazy")
require("config.options")
require("config.keymaps")

vim.api.nvim_create_user_command("FormatDisable", function(args)
	if args.bang then
		-- FormatDisable! will disable formatting just for this buffer
		vim.b.disable_autoformat = true
	else
		vim.g.disable_autoformat = true
	end
end, {
	desc = "Disable autoformat-on-save",
	bang = true,
})
vim.api.nvim_create_user_command("FormatEnable", function()
	vim.b.disable_autoformat = false
	vim.g.disable_autoformat = false
end, {
	desc = "Re-enable autoformat-on-save",
})

-- require("lsp_signature").setup()
vim.keymap.set("n", "<leader>[", function()
	require("treesitter-context").go_to_context(vim.v.count1)
end, { silent = true })

vim.cmd.colorscheme("catppuccin")

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
-- vim.api.nvim_set_keymap("n", "K", ":Lspsaga hover_doc<CR>", { noremap = true, silent = true, desc = "Show doc" })

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

-- Set up nvim-cmp.
local cmp = require("cmp")

cmp.setup({
	performance = {
		max_view_entries = 20,
	},
	snippet = {
		expand = function(args)
			require("luasnip").lsp_expand(args.body) -- For `luasnip` users.
		end,
	},
	window = {
		completion = cmp.config.window.bordered(),
		documentation = cmp.config.window.bordered(),
	},
	mapping = cmp.mapping.preset.insert({
		["<C-b>"] = cmp.mapping.scroll_docs(-4),
		["<C-f>"] = cmp.mapping.scroll_docs(4),
		["<C-Space>"] = cmp.mapping.complete(),
		["<C-e>"] = cmp.mapping.abort(),
		["<CR>"] = cmp.mapping.confirm({ select = true }), -- Accept currently selected item. Set `select` to `false` to only confirm explicitly selected items.
		["<Tab>"] = cmp.mapping(function(fallback)
			if cmp.visible() then
				cmp.select_next_item()
			elseif luasnip.expand_or_jumpable() then
				luasnip.expand_or_jump()
			else
				fallback()
			end
		end, { "i", "s" }),
	}),
	sources = cmp.config.sources({
		{ name = "nvim_lsp" },
		-- { name = 'vsnip' }, -- For vsnip users.
		{ name = "luasnip" }, -- For luasnip users.
		-- { name = 'ultisnips' }, -- For ultisnips users.
		-- { name = 'snippy' }, -- For snippy users.
	}, {
		-- { name = 'buffer' },
	}),
})

-- Set configuration for specific filetype.
cmp.setup.filetype("gitcommit", {
	sources = cmp.config.sources({
		{ name = "git" }, -- You can specify the `git` source if [you were installed it](https://github.com/petertriho/cmp-git).
	}, {
		{ name = "buffer" },
	}),
})

-- Use buffer source for `/` and `?` (if you enabled `native_menu`, this won't work anymore).
cmp.setup.cmdline({ "/", "?" }, {
	mapping = cmp.mapping.preset.cmdline(),
	sources = {
		{ name = "buffer" },
	},
})

-- Use cmdline & path source for ':' (if you enabled `native_menu`, this won't work anymore).
cmp.setup.cmdline(":", {
	mapping = cmp.mapping.preset.cmdline(),
	sources = cmp.config.sources({
		{ name = "path" },
	}, {
		{ name = "cmdline" },
	}),
	matching = { disallow_symbol_nonprefix_matching = false },
})

-- Set up lspconfig.
local capabilities = require("cmp_nvim_lsp").default_capabilities()
-- Replace <YOUR_LSP_SERVER> with each lsp server you've enabled.
--[[
  require('lspconfig')['lua_ls'].setup {
    capabilities = capabilities
  }
  ]]
--
require("mason-lspconfig").setup_handlers({
	-- The first entry (without a key) will be the default handler
	-- and will be called for each installed server that doesn't have
	-- a dedicated handler.
	function(server_name) -- default handler (optional)
		require("lspconfig")[server_name].setup({
			capabilities = capabilities,
		})
	end,
})
