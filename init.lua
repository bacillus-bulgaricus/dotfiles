local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not (vim.uv or vim.loop).fs_stat(lazypath) then
	vim.fn.system({
		"git",
		"clone",
		"--filter=blob:none",
		"https://github.com/folke/lazy.nvim.git",
		"--branch=stable", -- latest stable release
		lazypath,
	})
end

vim.opt.rtp:prepend(lazypath)
vim.opt.wildignore = { "*.o", "*.a", "__pycache__" }
vim.opt.formatoptions = { n = true, j = true, t = true }

--[[
print(vim.fn.printf('Hello from %s', 'Lua'))
local reversed_list = vim.fn.reverse({ 'a', 'b', 'c' })
vim.print(reversed_list) -- { "c", "b", "a" }
local function print_stdout(chan_id, data, name)
  print(data[1])
end
vim.fn.jobstart('ls', { on_stdout = print_stdout })
print(vim.fn.printf('Hello from %s', 'Lua'))

print("Mapping leader to space")
]]
--

vim.opt.number = true
vim.opt.relativenumber = true
vim.g.mapleader = " "
vim.g.neovide_input_macos_alt_is_meta = true

-- -- Normal mode mapping for Vim command
-- vim.keymap.set('n', '<Leader>ex1', '<cmd>echo "Example 1"<cr>')
-- -- Normal and Command-line mode mapping for Vim command
-- -- vim.keymap.set({'n', 'c'}, '<Leader>ex2', '<cmd>echo "Example 2"<cr>')
-- -- Normal mode mapping for Lua function
-- vim.keymap.set('n', '<Leader>ex3', vim.treesitter.start)
-- -- Normal mode mapping for Lua function with arguments
-- vim.keymap.set('n', '<Leader>ex4', function() print('Example 4') end)

vim.api.nvim_create_autocmd("TextYankPost", {
	callback = function()
		vim.highlight.on_yank()
	end,
	desc = "Briefly highlight yanked text",
})

-- PLUGINS
-- For terminal prompt: https://github.com/starship/starship
require("lazy").setup({
	-- Status line
	{ "nvim-lualine/lualine.nvim", dependencies = { "nvim-tree/nvim-web-devicons" } },

	--File Navigation
	{
		"stevearc/oil.nvim",
		opts = {},
		-- Optional dependencies
		dependencies = { "nvim-tree/nvim-web-devicons" },
	},
	{
		"ThePrimeagen/harpoon",
		branch = "harpoon2",
		dependencies = { "nvim-lua/plenary.nvim" },
	},

	--Colorscheme
	{
		"catppuccin/nvim",
		name = "catppuccin",
		priority = 1000,
	},

	-- Git
	"lewis6991/gitsigns.nvim",
	"tpope/vim-fugitive",
	"ruifm/gitlinker.nvim",

	-- LSP
	"williamboman/mason-lspconfig.nvim",
	"williamboman/mason.nvim",
	"neovim/nvim-lspconfig",

	-- Format
	{ "stevearc/conform.nvim", opts = {} },

	-- Autocomplete
	"hrsh7th/cmp-nvim-lsp",
	"hrsh7th/cmp-buffer",
	"hrsh7th/cmp-path",
	"hrsh7th/cmp-cmdline",
	"hrsh7th/nvim-cmp",
	{ "L3MON4D3/LuaSnip", version = "v2.*", build = "make install_jsregexp" },
	"saadparwaiz1/cmp_luasnip",
	"folke/which-key.nvim",
	{ "folke/neodev.nvim", opts = {} },

	{ "nvim-treesitter/nvim-treesitter", build = ":TSUpdate" },
	{
		"nvim-telescope/telescope.nvim",
		tag = "0.1.6",
		-- or                              , branch = '0.1.x',
		dependencies = { "nvim-lua/plenary.nvim" },
	},
	{ "nvim-telescope/telescope-fzf-native.nvim", build = "make" },

	-- Obsidian
	{
		"epwalsh/obsidian.nvim",
		version = "*", -- recommended, use latest release instead of latest commit
		lazy = true,
		ft = "markdown",
		-- Replace the above line with this if you only want to load obsidian.nvim for markdown files in your vault:
		-- event = {
		--   -- If you want to use the home shortcut '~' here you need to call 'vim.fn.expand'.
		--   -- E.g. "BufReadPre " .. vim.fn.expand "~" .. "/my-vault/**.md"
		--   "BufReadPre path/to/my-vault/**.md",
		--   "BufNewFile path/to/my-vault/**.md",
		-- },
		dependencies = {
			-- Required.
			"nvim-lua/plenary.nvim",
		},
	},
})

require("obsidian").setup({
	-- A list of workspace names, paths, and configuration overrides.
	-- If you use the Obsidian app, the 'path' of a workspace should generally be
	-- your vault root (where the `.obsidian` folder is located).
	-- When obsidian.nvim is loaded by your plugin manager, it will automatically set
	-- the workspace to the first workspace in the list whose `path` is a parent of the
	-- current markdown file being edited.
	workspaces = {
		{
			name = "personal",
			path = "~/personal/vault",
		},
		{
			name = "work",
			path = "~/work/work_vault",
		},
	},

	-- Alternatively - and for backwards compatibility - you can set 'dir' to a single path instead of
	-- 'workspaces'. For example:
	-- dir = "~/vaults/work",

	-- Optional, if you keep notes in a specific subdirectory of your vault.
	notes_subdir = "notes",

	-- Optional, set the log level for obsidian.nvim. This is an integer corresponding to one of the log
	-- levels defined by "vim.log.levels.*".
	log_level = vim.log.levels.INFO,

	daily_notes = {
		-- Optional, if you keep daily notes in a separate directory.
		folder = "notes/dailies",
		-- Optional, if you want to change the date format for the ID of daily notes.
		date_format = "%Y-%m-%d",
		-- Optional, if you want to change the date format of the default alias of daily notes.
		alias_format = "%B %-d, %Y",
		-- Optional, if you want to automatically insert a template from your template directory like 'daily.md'
		template = nil,
	},

	-- Optional, completion of wiki links, local markdown links, and tags using nvim-cmp.
	completion = {
		-- Set to false to disable completion.
		nvim_cmp = true,
		-- Trigger completion at 2 chars.
		min_chars = 2,
	},

	-- Optional, configure key mappings. These are the defaults. If you don't want to set any keymappings this
	-- way then set 'mappings = {}'.
	mappings = {
		-- Overrides the 'gf' mapping to work on markdown/wiki links within your vault.
		["gf"] = {
			action = function()
				return require("obsidian").util.gf_passthrough()
			end,
			opts = { noremap = false, expr = true, buffer = true },
		},
		-- Toggle check-boxes.
		["<leader>ch"] = {
			action = function()
				return require("obsidian").util.toggle_checkbox()
			end,
			opts = { buffer = true },
		},
		-- Smart action depending on context, either follow link or toggle checkbox.
		["<cr>"] = {
			action = function()
				return require("obsidian").util.smart_action()
			end,
			opts = { buffer = true, expr = true },
		},
	},

	-- Where to put new notes. Valid options are
	--  * "current_dir" - put new notes in same directory as the current buffer.
	--  * "notes_subdir" - put new notes in the default notes subdirectory.
	new_notes_location = "notes_subdir",

	-- Optional, customize how note IDs are generated given an optional title.
	---@param title string|?
	---@return string
	note_id_func = function(title)
		-- Create note IDs in a Zettelkasten format with a timestamp and a suffix.
		-- In this case a note with the title 'My new note' will be given an ID that looks
		-- like '1657296016-my-new-note', and therefore the file name '1657296016-my-new-note.md'
		local suffix = ""
		if title ~= nil then
			-- If title is given, transform it into valid file name.
			suffix = title:gsub(" ", "-"):gsub("[^A-Za-z0-9-]", ""):lower()
		else
			-- If title is nil, just add 4 random uppercase letters to the suffix.
			for _ = 1, 4 do
				suffix = suffix .. string.char(math.random(65, 90))
			end
		end
		return tostring(os.time()) .. "-" .. suffix
	end,

	-- Optional, customize how note file names are generated given the ID, target directory, and title.
	---@param spec { id: string, dir: obsidian.Path, title: string|? }
	---@return string|obsidian.Path The full path to the new note.
	note_path_func = function(spec)
		-- This is equivalent to the default behavior.
		local path = spec.dir / tostring(spec.id)
		return path:with_suffix(".md")
	end,

	-- Optional, customize how wiki links are formatted. You can set this to one of:
	--  * "use_alias_only", e.g. '[[Foo Bar]]'
	--  * "prepend_note_id", e.g. '[[foo-bar|Foo Bar]]'
	--  * "prepend_note_path", e.g. '[[foo-bar.md|Foo Bar]]'
	--  * "use_path_only", e.g. '[[foo-bar.md]]'
	-- Or you can set it to a function that takes a table of options and returns a string, like this:
	wiki_link_func = function(opts)
		return require("obsidian.util").wiki_link_id_prefix(opts)
	end,

	-- Optional, customize how markdown links are formatted.
	markdown_link_func = function(opts)
		return require("obsidian.util").markdown_link(opts)
	end,

	-- Either 'wiki' or 'markdown'.
	preferred_link_style = "wiki",

	-- Optional, customize the default name or prefix when pasting images via `:ObsidianPasteImg`.
	---@return string
	image_name_func = function()
		-- Prefix image names with timestamp.
		return string.format("%s-", os.time())
	end,

	-- Optional, boolean or a function that takes a filename and returns a boolean.
	-- `true` indicates that you don't want obsidian.nvim to manage frontmatter.
	disable_frontmatter = false,

	-- Optional, alternatively you can customize the frontmatter data.
	---@return table
	note_frontmatter_func = function(note)
		-- Add the title of the note as an alias.
		if note.title then
			note:add_alias(note.title)
		end

		local out = { id = note.id, aliases = note.aliases, tags = note.tags }

		-- `note.metadata` contains any manually added fields in the frontmatter.
		-- So here we just make sure those fields are kept in the frontmatter.
		if note.metadata ~= nil and not vim.tbl_isempty(note.metadata) then
			for k, v in pairs(note.metadata) do
				out[k] = v
			end
		end

		return out
	end,

	-- Optional, for templates (see below).
	templates = {
		folder = "templates",
		date_format = "%Y-%m-%d",
		time_format = "%H:%M",
		-- A map for custom variables, the key should be the variable and the value a function
		substitutions = {},
	},

	-- Optional, by default when you use `:ObsidianFollowLink` on a link to an external
	-- URL it will be ignored but you can customize this behavior here.
	---@param url string
	follow_url_func = function(url)
		-- Open the URL in the default web browser.
		vim.fn.jobstart({ "open", url }) -- Mac OS
		-- vim.fn.jobstart({"xdg-open", url})  -- linux
	end,

	-- Optional, set to true if you use the Obsidian Advanced URI plugin.
	-- https://github.com/Vinzent03/obsidian-advanced-uri
	use_advanced_uri = false,

	-- Optional, set to true to force ':ObsidianOpen' to bring the app to the foreground.
	open_app_foreground = false,

	picker = {
		-- Set your preferred picker. Can be one of 'telescope.nvim', 'fzf-lua', or 'mini.pick'.
		name = "telescope.nvim",
		-- Optional, configure key mappings for the picker. These are the defaults.
		-- Not all pickers support all mappings.
		mappings = {
			-- Create a new note from your query.
			new = "<C-x>",
			-- Insert a link to the selected note.
			insert_link = "<C-l>",
		},
	},

	-- Optional, sort search results by "path", "modified", "accessed", or "created".
	-- The recommend value is "modified" and `true` for `sort_reversed`, which means, for example,
	-- that `:ObsidianQuickSwitch` will show the notes sorted by latest modified time
	sort_by = "modified",
	sort_reversed = true,

	-- Optional, determines how certain commands open notes. The valid options are:
	-- 1. "current" (the default) - to always open in the current window
	-- 2. "vsplit" - to open in a vertical split if there's not already a vertical split
	-- 3. "hsplit" - to open in a horizontal split if there's not already a horizontal split
	open_notes_in = "current",

	-- Optional, define your own callbacks to further customize behavior.
	callbacks = {
		-- Runs at the end of `require("obsidian").setup()`.
		---@param client obsidian.Client
		post_setup = function(client) end,

		-- Runs anytime you enter the buffer for a note.
		---@param client obsidian.Client
		---@param note obsidian.Note
		enter_note = function(client, note) end,

		-- Runs anytime you leave the buffer for a note.
		---@param client obsidian.Client
		---@param note obsidian.Note
		leave_note = function(client, note) end,

		-- Runs right before writing the buffer for a note.
		---@param client obsidian.Client
		---@param note obsidian.Note
		pre_write_note = function(client, note) end,

		-- Runs anytime the workspace is set/changed.
		---@param client obsidian.Client
		---@param workspace obsidian.Workspace
		post_set_workspace = function(client, workspace) end,
	},

	-- Optional, configure additional syntax highlighting / extmarks.
	-- This requires you have `conceallevel` set to 1 or 2. See `:help conceallevel` for more details.
	ui = {
		enable = true, -- set to false to disable all additional syntax features
		update_debounce = 200, -- update delay after a text change (in milliseconds)
		-- Define how various check-boxes are displayed
		checkboxes = {
			-- NOTE: the 'char' value has to be a single character, and the highlight groups are defined below.
			[" "] = { char = "󰄱", hl_group = "ObsidianTodo" },
			["x"] = { char = "", hl_group = "ObsidianDone" },
			[">"] = { char = "", hl_group = "ObsidianRightArrow" },
			["~"] = { char = "󰰱", hl_group = "ObsidianTilde" },
			-- Replace the above with this if you don't have a patched font:
			-- [" "] = { char = "☐", hl_group = "ObsidianTodo" },
			-- ["x"] = { char = "✔", hl_group = "ObsidianDone" },

			-- You can also add more custom ones...
		},
		-- Use bullet marks for non-checkbox lists.
		bullets = { char = "•", hl_group = "ObsidianBullet" },
		external_link_icon = { char = "", hl_group = "ObsidianExtLinkIcon" },
		-- Replace the above with this if you don't have a patched font:
		-- external_link_icon = { char = "", hl_group = "ObsidianExtLinkIcon" },
		reference_text = { hl_group = "ObsidianRefText" },
		highlight_text = { hl_group = "ObsidianHighlightText" },
		tags = { hl_group = "ObsidianTag" },
		block_ids = { hl_group = "ObsidianBlockID" },
		hl_groups = {
			-- The options are passed directly to `vim.api.nvim_set_hl()`. See `:help nvim_set_hl`.
			ObsidianTodo = { bold = true, fg = "#f78c6c" },
			ObsidianDone = { bold = true, fg = "#89ddff" },
			ObsidianRightArrow = { bold = true, fg = "#f78c6c" },
			ObsidianTilde = { bold = true, fg = "#ff5370" },
			ObsidianBullet = { bold = true, fg = "#89ddff" },
			ObsidianRefText = { underline = true, fg = "#c792ea" },
			ObsidianExtLinkIcon = { fg = "#c792ea" },
			ObsidianTag = { italic = true, fg = "#89ddff" },
			ObsidianBlockID = { italic = true, fg = "#89ddff" },
			ObsidianHighlightText = { bg = "#75662e" },
		},
	},

	-- Specify how to handle attachments.
	attachments = {
		-- The default folder to place images in via `:ObsidianPasteImg`.
		-- If this is a relative path it will be interpreted as relative to the vault root.
		-- You can always override this per image by passing a full path to the command instead of just a filename.
		img_folder = "assets/imgs", -- This is the default
		-- A function that determines the text to insert in the note when pasting an image.
		-- It takes two arguments, the `obsidian.Client` and an `obsidian.Path` to the image file.
		-- This is the default implementation.
		---@param client obsidian.Client
		---@param path obsidian.Path the absolute path to the image file
		---@return string
		img_text_func = function(client, path)
			path = client:vault_relative_path(path) or path
			return string.format("![%s](%s)", path.name, path)
		end,
	},
})
require("conform").setup({
	formatters_by_ft = {
		lua = { "stylua" },
		-- Conform will run multiple formatters sequentially
		python = { "isort", "black" },
		go = { "gofmt" },
		-- Use a sub-list to run only the first available formatter
		javascript = { { "prettierd", "prettier" } },
		json = { "jq" },
		yaml = { "yq" },
		proto = { "buf" },
		-- Use the "*" filetype to run formatters on all filetypes.
		["*"] = { "codespell" },
		-- Use the "_" filetype to run formatters on filetypes that don't
		-- have other formatters configured.
		["_"] = { "trim_whitespace" },
	},
	format_on_save = function(bufnr)
		-- Disable with a global or buffer-local variable
		if vim.g.disable_autoformat or vim.b[bufnr].disable_autoformat then
			return
		end
		return { timeout_ms = 500, lsp_fallback = true }
	end,
})

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

require("nvim-treesitter.configs").setup({
	-- A list of parser names, or "all" (the five listed parsers should always be installed)
	ensure_installed = {
		"c",
		"cpp",
		"go",
		"python",
		"rust",
		"lua",
		"vim",
		"vimdoc",
		"query",
		"markdown",
		"markdown_inline",
	},
	-- Install parsers synchronously (only applied to `ensure_installed`)
	sync_install = false,
	-- Automatically install missing parsers when entering buffer
	-- Recommendation: set to false if you don't have `tree-sitter` CLI installed locally
	auto_install = true,
	-- List of parsers to ignore installing (or "all")
	ignore_install = {},
	---- If you need to change the installation directory of the parsers (see -> Advanced Setup)
	-- parser_install_dir = "/some/path/to/store/parsers", -- Remember to run vim.opt.runtimepath:append("/some/path/to/store/parsers")!
	highlight = { enable = true },
})

require("oil").setup()
local harpoon = require("harpoon")
harpoon:setup({})

require("lualine").setup({
	options = { theme = "auto" },
})
require("telescope").load_extension("fzf")
require("neodev").setup()
require("mason").setup()
require("mason-lspconfig").setup()
vim.cmd.colorscheme("catppuccin")

local builtin = require("telescope.builtin")
vim.keymap.set("n", "<leader>ff", builtin.find_files, {})
vim.keymap.set("n", "<leader>fg", builtin.live_grep, {})
vim.keymap.set("n", "<leader><leader>", builtin.buffers, {})
vim.keymap.set("n", "<leader>fh", builtin.help_tags, {})
vim.diagnostic.config({ virtual_text = false })

vim.keymap.set("n", "<leader>e", vim.diagnostic.open_float)
vim.keymap.set("n", "<leader>ca", function()
	vim.lsp.buf.code_action()
end, { desc = "Show code actions" })

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

require("which-key").setup()

-- Set up nvim-cmp.
local cmp = require("cmp")
local luasnip = require("luasnip")

luasnip.config.setup({})

cmp.setup({
	snippet = {
		expand = function(args)
			require("luasnip").lsp_expand(args.body) -- For `luasnip` users.
		end,
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

require("gitlinker").setup()
require("gitsigns").setup({
	on_attach = function(bufnr)
		local gitsigns = require("gitsigns")

		local function map(mode, l, r, opts)
			opts = opts or {}
			opts.buffer = bufnr
			vim.keymap.set(mode, l, r, opts)
		end

		-- Navigation
		map("n", "]c", function()
			if vim.wo.diff then
				vim.cmd.normal({ "]c", bang = true })
			else
				gitsigns.nav_hunk("next")
			end
		end)

		map("n", "[c", function()
			if vim.wo.diff then
				vim.cmd.normal({ "[c", bang = true })
			else
				gitsigns.nav_hunk("prev")
			end
		end)

		-- Actions
		map("n", "<leader>hs", gitsigns.stage_hunk)
		map("n", "<leader>hr", gitsigns.reset_hunk)
		map("v", "<leader>hs", function()
			gitsigns.stage_hunk({ vim.fn.line("."), vim.fn.line("v") })
		end)
		map("v", "<leader>hr", function()
			gitsigns.reset_hunk({ vim.fn.line("."), vim.fn.line("v") })
		end)
		map("n", "<leader>hS", gitsigns.stage_buffer)
		map("n", "<leader>hu", gitsigns.undo_stage_hunk)
		map("n", "<leader>hR", gitsigns.reset_buffer)
		map("n", "<leader>hp", gitsigns.preview_hunk)
		map("n", "<leader>hb", function()
			gitsigns.blame_line({ full = true })
		end)
		map("n", "<leader>tb", gitsigns.toggle_current_line_blame)
		map("n", "<leader>hd", gitsigns.diffthis)
		map("n", "<leader>hD", function()
			gitsigns.diffthis("~")
		end)
		map("n", "<leader>td", gitsigns.toggle_deleted)

		-- Text object
		map({ "o", "x" }, "ih", ":<C-U>Gitsigns select_hunk<CR>")
	end,
})
