return {
	"catppuccin/nvim",
	name = "catppuccin",
	priority = 1000,
	opts = {
		transparent_background = true, -- handles Normal, NormalNC, etc.
		  integrations = {
		    cmp = true,
		    telescope = {
		      enabled = true,
		      style = "nvchad",
		    },
		    treesitter = true,
		    native_lsp = {
		      enabled = true,
		    },
		    -- more integrations here if needed
		  },
	  },
}

