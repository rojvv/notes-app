<div align="center">

# Parse Modes

<sup>Synced with [tdlib/td:7c3822d932](https://github.com/tdlib/td/tree/7c3822d932f96aeca2861b6ae0cb25eacb27136f).</sup>

</div>

A **work-in-progress** TypeScript implementation of [TDLib](https://github.com/tdlib/td)'s functions and utilities
related to parsing text with several parse modes and matching text entities.

Few more methods are left to be implemented. But the tests are direclty ported from TDLib source without a change. And
they seem to be passing. So, I'll take that as a "it works"! I cannot assure you the quality of the implementation, as
I'm **not** good at C++ (TDLib is written in C++). So, I probably have done few stupid things because I missed how C++
actually works.

<details>
  <summary>Anyway, thank you.</summary>

#### Here is what we currently have here. <sup>I'm just showing off!</sup>

But of course, they still might have a few bugs. If you ever encounter one please consider opening an issue.

###### match.ts (td/telegram/MessageEntity.cpp)

- match_mentions
- match_bot_commands
- match_hashtags
- match_cashtags
- match_media_timestamps
- match_bank_card_numbers
- is_url_unicode_symbol
- is_url_path_symbol
- match_tg_urls
- is_protocol_symbol
- is_user_data_symbol
- is_domain_symbol
- match_urls
- is_valid_bank_card
- is_email_address
- is_common_tld
- fix_url
- get_valid_short_usernames
- find_mentions
- find_bot_commands
- find_hashtags
- find_cashtags
- find_bank_card_numbers
- find_tg_urls
- find_urls
- find_media_timestamps
- text_length
- get_type_priority
- remove_empty_entities
- sort_entities
- check_is_sorted
- check_non_intersecting
- get_entity_type_mask
- get_splittable_entities_mask
- get_blockquote_entities_mask
- get_continuous_entities_mask
- get_pre_entities_mask
- get_user_entities_mask
- is_splittable_entity
- is_blockquote_entity
- is_continuous_entity
- is_pre_entity
- is_user_entity
- is_hidden_data_entity
- get_splittable_entity_type_index
- are_entities_valid
- remove_intersecting_entities
- remove_entities_intersecting_blockquote
- fix_entity_offsets
- find_entities
- find_media_timestamp_entities
- merge_entities
- is_plain_domain
- get_first_url
- parse_markdown
- parse_markdown_v2
- decode_html_entity
- parse_html

###### utilities.ts (from a lot of source files)

- is_word_character
- to_lower_begins_with
- to_lower
- split
- full_split
- begins_with
- ends_with
- is_space
- is_alpha
- is_alpha (from misc.h)
- is_alnum
- is_digit
- is_alpha_digit
- is_alpha_digit_or_underscore
- is_alpha_digit_underscore_or_minus
- is_hex_digit
- hex_to_int
- is_hashtag_letter
- CHECK
- LOG_CHECK

###### unicode.ts (tdutils/td/utils/unicode.cpp)

- UnicodeSimpleCategory
- get_unicode_simple_category
- binary_search_ranges
- unicode_to_lower

###### utf8.ts (tdutils/td/utils/utf8.cpp)

- is_utf8_character_first_code_unit
- utf8_length
- utf8_utf16_length
- prev_utf8_unsafe
- next_utf8_unsafe
- append_utf8_character
- append_utf8_character_unsafe
- utf8_to_lower
- utf8_truncate
- utf8_utf16_truncate
- utf8_substr
- utf8_utf16_substr
- check_utf8

###### Other stuff

- CustomEmojiId
- HttpUrl
- HttpUrlProtocol
- parse_url
- IpAddress
- parse_ipv6 (a compatible port from core-js)
- LinkManager
  - getLinkUserId
  - getLinkCustomEmojiId
  - getCheckedLink
  - checkLinkImpl
- UserId

> \* Most likely too buggy.

</details>
