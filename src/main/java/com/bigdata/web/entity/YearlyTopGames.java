package com.bigdata.web.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName("yearly_top_games")
public class YearlyTopGames {

  private Long publishYear;
  private String title;
  private Double reviewCount;

}
