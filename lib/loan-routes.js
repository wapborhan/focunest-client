/** Lending and borrowing are separate sections, each with its own pages. */
export const loanBase = (direction) => (direction === "lent" ? "/cash/lending" : "/cash/borrowing");
export const loanHref = (loan) => `${loanBase(loan.direction)}/${loan.id}`;
