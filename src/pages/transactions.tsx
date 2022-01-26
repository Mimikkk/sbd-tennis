import { Typography } from "@mui/material";
import { EmptyPage, Tile } from "shared/components";
import { useTransactionList } from "dedicated/hooks";

export default () => {
  const [TransactionList, TransactionListContext] = useTransactionList();

  return (
    <Tile>
      <TransactionListContext>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h3">Transactions</Typography>
          </div>

          <div style={{ flex: 1 }}>
            {TransactionList.length !== 0 ? <TransactionList /> : <EmptyPage />}
          </div>
        </div>
      </TransactionListContext>
    </Tile>
  );
};
